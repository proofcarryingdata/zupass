
CREATE TABLE user_emails (
    user_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    FOREIGN KEY (user_id) REFERENCES users(uuid) ON DELETE CASCADE,
    PRIMARY KEY (user_id, email)
);

INSERT INTO user_emails (user_id, email)
SELECT uuid as user_id, email
FROM users
WHERE email IS NOT NULL;

ALTER TABLE users DROP COLUMN email;
