-- Bước 7: tài khoản người dùng, vai trò, người đăng sự kiện/địa điểm

CREATE TABLE users (
  id            serial PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,                 -- mật khẩu đã băm bằng bcrypt, không lưu mật khẩu gốc
  display_name  text NOT NULL,
  -- user: người dùng thường; celebrity: người nổi tiếng; venue_owner: chủ địa điểm/KOL; admin: quản trị viên
  role          text NOT NULL DEFAULT 'user'
                CHECK (role IN ('user', 'celebrity', 'venue_owner', 'admin')),
  is_verified   boolean NOT NULL DEFAULT false, -- quản trị viên xác thực thủ công (huy hiệu)
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE venues ADD COLUMN owner_id int REFERENCES users (id);
ALTER TABLE events ADD COLUMN created_by int REFERENCES users (id);
CREATE INDEX events_created_by_idx ON events (created_by);
