-- Bước 8: nhật ký kiểm duyệt (ai duyệt/từ chối/xác thực cái gì, lúc nào)
CREATE TABLE moderation_logs (
  id          serial PRIMARY KEY,
  admin_id    int NOT NULL REFERENCES users (id),
  target_type text NOT NULL CHECK (target_type IN ('event', 'venue', 'user')),
  target_id   int NOT NULL,
  action      text NOT NULL,                  -- approved / rejected / verify / unverify
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX moderation_logs_created_idx ON moderation_logs (created_at DESC);
