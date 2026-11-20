-- =====================================================================
-- Схема БД веб-приложения для организации выставок (PostgreSQL 15+).
-- Единый файл: расширения -> типы -> таблицы -> индексы -> функции ->
-- триггеры -> представления. Порядок важен: объект создаётся только
-- после тех, от которых он зависит. Файл можно запускать повторно.
-- Запуск: npm run db:init (из папки server)
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Расширения
-- ---------------------------------------------------------------------
-- pg_trgm нужен для GIN-индекса поиска по подстроке (ILIKE '%q%')
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------
-- 2. ENUM-типы
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------
-- 3. Таблицы (родительские раньше дочерних)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email               varchar(254) NOT NULL UNIQUE,
  name                varchar(60)  NOT NULL,
  password_hash       char(60)     NOT NULL,          -- bcrypt, всегда 60 символов
  role                user_role    NOT NULL DEFAULT 'user',
  is_blocked          boolean      NOT NULL DEFAULT false,
  email_verified_at   timestamptz,                    -- NULL: адрес не подтверждён
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now(),
  password_changed_at timestamptz,                    -- токены с более ранним iat отклоняются
  CONSTRAINT users_email_lowercase CHECK (email = lower(email)),
  CONSTRAINT users_name_length     CHECK (char_length(name) >= 2)
);

CREATE TABLE IF NOT EXISTS categories (
  id   integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name varchar(80) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_name_lower ON categories (lower(name));

CREATE TABLE IF NOT EXISTS cities (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        varchar(80)      NOT NULL,
  wikidata_id varchar(20)      UNIQUE,                -- например, Q2280; ключ для импорта
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  boundary    jsonb,                                  -- GeoJSON Polygon / MultiPolygon или NULL
  CONSTRAINT cities_wikidata_format CHECK (wikidata_id IS NULL OR wikidata_id ~ '^Q[0-9]+$'),
  CONSTRAINT cities_lat_range CHECK (lat BETWEEN -90 AND 90),
  CONSTRAINT cities_lng_range CHECK (lng BETWEEN -180 AND 180),
  CONSTRAINT cities_boundary_type CHECK (
    boundary IS NULL OR boundary->>'type' IN ('Polygon', 'MultiPolygon')
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cities_name_lower ON cities (lower(name));

CREATE TABLE IF NOT EXISTS exhibitions (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title       varchar(150) NOT NULL,
  description text         NOT NULL,
  category_id integer      NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  city_id     integer      NOT NULL REFERENCES cities (id)     ON DELETE RESTRICT,
  address     varchar(200) NOT NULL,
  lat         double precision,
  lng         double precision,
  start_date  date         NOT NULL,
  end_date    date         NOT NULL,
  price       numeric(10, 2),                         -- 0  - бесплатно, NULL  - не указана
  image_url   varchar(500),
  saved_count integer      NOT NULL DEFAULT 0,        -- обновляется триггером
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT exhibitions_title_length  CHECK (char_length(title) >= 3),
  CONSTRAINT exhibitions_description_length CHECK (char_length(description) BETWEEN 20 AND 5000),
  CONSTRAINT exhibitions_address_length CHECK (char_length(address) >= 3),
  CONSTRAINT exhibitions_lat_range CHECK (lat BETWEEN -90 AND 90),
  CONSTRAINT exhibitions_lng_range CHECK (lng BETWEEN -180 AND 180),
  CONSTRAINT exhibitions_coords_pair CHECK ((lat IS NULL) = (lng IS NULL)),
  CONSTRAINT exhibitions_dates_order CHECK (end_date >= start_date),
  CONSTRAINT exhibitions_price_range CHECK (price IS NULL OR price >= 0),
  CONSTRAINT exhibitions_image_url_format CHECK (image_url IS NULL OR image_url ~ '^https?://'),
  CONSTRAINT exhibitions_saved_count_range CHECK (saved_count >= 0)
);

-- Заявка  - снимок предложенных данных выставки; после создания меняются
-- только статус и служебные поля обработки.
CREATE TABLE IF NOT EXISTS submissions (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       integer      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title         varchar(150) NOT NULL,
  description   text         NOT NULL,
  category_id   integer      NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  city_id       integer      NOT NULL REFERENCES cities (id)     ON DELETE RESTRICT,
  address       varchar(200) NOT NULL,
  lat           double precision,
  lng           double precision,
  start_date    date         NOT NULL,
  end_date      date         NOT NULL,
  price         numeric(10, 2),
  image_url     varchar(500),
  status        submission_status NOT NULL DEFAULT 'pending',
  reject_reason varchar(500),
  reviewed_by   integer      REFERENCES users (id) ON DELETE SET NULL,
  reviewed_at   timestamptz,
  exhibition_id integer      UNIQUE REFERENCES exhibitions (id) ON DELETE SET NULL,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT submissions_title_length  CHECK (char_length(title) >= 3),
  CONSTRAINT submissions_description_length CHECK (char_length(description) BETWEEN 20 AND 5000),
  CONSTRAINT submissions_address_length CHECK (char_length(address) >= 3),
  CONSTRAINT submissions_lat_range CHECK (lat BETWEEN -90 AND 90),
  CONSTRAINT submissions_lng_range CHECK (lng BETWEEN -180 AND 180),
  CONSTRAINT submissions_coords_pair CHECK ((lat IS NULL) = (lng IS NULL)),
  CONSTRAINT submissions_dates_order CHECK (end_date >= start_date),
  CONSTRAINT submissions_price_range CHECK (price IS NULL OR price >= 0),
  CONSTRAINT submissions_image_url_format CHECK (image_url IS NULL OR image_url ~ '^https?://'),
  CONSTRAINT submissions_reject_reason_length CHECK (reject_reason IS NULL OR char_length(reject_reason) >= 5),
  CONSTRAINT submissions_status_consistency CHECK (
    (status = 'pending'
       AND reviewed_by IS NULL AND reviewed_at IS NULL
       AND reject_reason IS NULL AND exhibition_id IS NULL)
    OR (status = 'approved'
       AND reviewed_at IS NOT NULL AND reject_reason IS NULL)
    OR (status = 'rejected'
       AND reviewed_at IS NOT NULL AND reject_reason IS NOT NULL AND exhibition_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS saved_exhibitions (
  user_id       integer     NOT NULL REFERENCES users (id)       ON DELETE CASCADE,
  exhibition_id integer     NOT NULL REFERENCES exhibitions (id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, exhibition_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     integer     NOT NULL REFERENCES users (id)      ON DELETE CASCADE,
  category_id integer     REFERENCES categories (id)          ON DELETE CASCADE,
  city_id     integer     REFERENCES cities (id)              ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_has_target CHECK (category_id IS NOT NULL OR city_id IS NOT NULL),
  -- PostgreSQL 15+: пустые значения тоже считаются одинаковыми
  CONSTRAINT subscriptions_unique UNIQUE NULLS NOT DISTINCT (user_id, category_id, city_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       integer     NOT NULL REFERENCES users (id)       ON DELETE CASCADE,
  exhibition_id integer     NOT NULL REFERENCES exhibitions (id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  read_at       timestamptz,                          -- NULL: не прочитано
  CONSTRAINT notifications_unique UNIQUE (user_id, exhibition_id)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    integer     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash char(64)    NOT NULL UNIQUE,             -- SHA-256 (hex); сам токен не хранится
  family_id  uuid        NOT NULL,                    -- цепочка ротации одного входа
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,                             -- NULL: токен действителен
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 4. Индексы (кроме созданных PRIMARY KEY / UNIQUE)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_exhibitions_city       ON exhibitions (city_id);
CREATE INDEX IF NOT EXISTS idx_exhibitions_category   ON exhibitions (category_id);
CREATE INDEX IF NOT EXISTS idx_exhibitions_start_date ON exhibitions (start_date);
CREATE INDEX IF NOT EXISTS idx_exhibitions_end_date   ON exhibitions (end_date);
CREATE INDEX IF NOT EXISTS idx_exhibitions_title_trgm ON exhibitions USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_saved_user_created  ON saved_exhibitions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_exhibition    ON saved_exhibitions (exhibition_id);

CREATE INDEX IF NOT EXISTS idx_submissions_status_created ON submissions (status, created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_user_created   ON submissions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_user_pending   ON submissions (user_id) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_subscriptions_category ON subscriptions (category_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_city     ON subscriptions (city_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread       ON notifications (user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_exhibition   ON notifications (exhibition_id);

CREATE INDEX IF NOT EXISTS idx_refresh_user   ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_family ON refresh_tokens (family_id);

-- ---------------------------------------------------------------------
-- 5. Функции
-- ---------------------------------------------------------------------
-- «Сегодня» по Europe/Minsk (НФТ-12). Используется каталогом и триггером.
CREATE OR REPLACE FUNCTION fn_today() RETURNS date
LANGUAGE sql STABLE AS $$
  SELECT (now() AT TIME ZONE 'Europe/Minsk')::date
$$;

-- Общая функция для триггеров trg_touch_*
CREATE OR REPLACE FUNCTION fn_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Создание уведомлений подписчикам при первой публикации выставки
CREATE OR REPLACE FUNCTION fn_exhibitions_notify() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.end_date >= fn_today() THEN
    INSERT INTO notifications (user_id, exhibition_id)
    SELECT DISTINCT s.user_id, NEW.id
    FROM subscriptions s
    JOIN users u ON u.id = s.user_id
    WHERE NOT u.is_blocked
      AND (s.city_id IS NULL OR s.city_id = NEW.city_id)
      AND (s.category_id IS NULL OR s.category_id = NEW.category_id)
    ON CONFLICT (user_id, exhibition_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

-- Поддержка счётчика exhibitions.saved_count
CREATE OR REPLACE FUNCTION fn_saved_count() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE exhibitions SET saved_count = saved_count + 1 WHERE id = NEW.exhibition_id;
  ELSE
    UPDATE exhibitions SET saved_count = greatest(saved_count - 1, 0) WHERE id = OLD.exhibition_id;
  END IF;
  RETURN NULL;
END $$;

-- Одобрение заявки: выставка создаётся и заявка переводится в approved
-- в одной транзакции. Возвращает id созданной выставки.
-- Ошибки (SQLSTATE P0001): NOT_FOUND, ALREADY_PROCESSED.
CREATE OR REPLACE FUNCTION fn_approve_submission(p_submission_id integer, p_admin_id integer)
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  s submissions%ROWTYPE;
  new_exhibition_id integer;
BEGIN
  SELECT * INTO s FROM submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF s.status <> 'pending' THEN
    RAISE EXCEPTION 'ALREADY_PROCESSED';
  END IF;

  INSERT INTO exhibitions (title, description, category_id, city_id, address,
                           lat, lng, start_date, end_date, price, image_url)
  VALUES (s.title, s.description, s.category_id, s.city_id, s.address,
          s.lat, s.lng, s.start_date, s.end_date, s.price, s.image_url)
  RETURNING id INTO new_exhibition_id;

  UPDATE submissions
     SET status = 'approved',
         reviewed_by = p_admin_id,
         reviewed_at = now(),
         exhibition_id = new_exhibition_id
   WHERE id = p_submission_id;

  RETURN new_exhibition_id;
END $$;

-- ---------------------------------------------------------------------
-- 6. Триггеры
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_touch_users ON users;
CREATE TRIGGER trg_touch_users BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_exhibitions ON exhibitions;
CREATE TRIGGER trg_touch_exhibitions BEFORE UPDATE ON exhibitions
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_submissions ON submissions;
CREATE TRIGGER trg_touch_submissions BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

DROP TRIGGER IF EXISTS trg_exhibitions_notify ON exhibitions;
CREATE TRIGGER trg_exhibitions_notify AFTER INSERT ON exhibitions
  FOR EACH ROW EXECUTE FUNCTION fn_exhibitions_notify();

DROP TRIGGER IF EXISTS trg_saved_count ON saved_exhibitions;
CREATE TRIGGER trg_saved_count AFTER INSERT OR DELETE ON saved_exhibitions
  FOR EACH ROW EXECUTE FUNCTION fn_saved_count();

-- ---------------------------------------------------------------------
-- 7. Представления
-- ---------------------------------------------------------------------
-- Выставка с названиями категории и города. Признак isSaved зависит от
-- пользователя, поэтому в представление не входит.
CREATE OR REPLACE VIEW v_exhibition_cards AS
SELECT e.id, e.title, e.description,
       e.category_id, c.name AS category_name,
       e.city_id,     ci.name AS city_name,
       e.address, e.lat, e.lng,
       e.start_date, e.end_date, e.price, e.image_url,
       e.saved_count, e.created_at, e.updated_at
FROM exhibitions e
JOIN categories c  ON c.id  = e.category_id
JOIN cities     ci ON ci.id = e.city_id;

-- Вовлечённость по категориям для панели администратора.
CREATE OR REPLACE VIEW v_category_engagement AS
SELECT c.id AS category_id,
       c.name AS category_name,
       count(DISTINCT e.id)                  AS exhibitions_count,
       COALESCE(sum(e.saved_count), 0)::int  AS saves_count,
       (SELECT count(*) FROM subscriptions s WHERE s.category_id = c.id)::int AS subscriptions_count
FROM categories c
LEFT JOIN exhibitions e ON e.category_id = c.id
GROUP BY c.id, c.name;

COMMIT;
