-- Bước 5: địa điểm (venue) và sự kiện (event)

-- geography(Point): điểm trên mặt cầu Trái Đất, tính khoảng cách ra mét chính xác
CREATE TABLE venues (
  id               serial PRIMARY KEY,
  name             text NOT NULL,
  address          text,
  category         text,
  location         geography(Point, 4326) NOT NULL,
  province_code    text NOT NULL REFERENCES provinces (code),
  ward_code        text REFERENCES wards (code),
  boundary_version text NOT NULL,              -- ranh giới dùng khi gán tỉnh/xã cho địa điểm
  approval_status  text NOT NULL DEFAULT 'pending'
                   CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX venues_location_idx ON venues USING gist (location);

CREATE TABLE events (
  id               serial PRIMARY KEY,
  title            text NOT NULL,
  description      text NOT NULL DEFAULT '',
  category         text NOT NULL,
  start_at         timestamptz NOT NULL,
  end_at           timestamptz NOT NULL,
  timezone         text NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  venue_id         int REFERENCES venues (id),
  address          text,
  location         geography(Point, 4326) NOT NULL,
  province_code    text NOT NULL REFERENCES provinces (code),
  ward_code        text REFERENCES wards (code),
  boundary_version text NOT NULL,
  ticket_url       text,
  approval_status  text NOT NULL DEFAULT 'pending'
                   CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);
-- Chỉ mục GiST trên cột geography: để ST_DWithin ("Quanh đây") chạy nhanh
CREATE INDEX events_location_idx ON events USING gist (location);
CREATE INDEX events_province_idx ON events (province_code);
CREATE INDEX events_ward_idx ON events (ward_code);
CREATE INDEX events_time_idx ON events (start_at, end_at);
