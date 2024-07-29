
-- Create new table referencing users table
CREATE TABLE user_emails (
    user_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, email)
);

-- Copy all user emails into the new table
INSERT INTO user_emails (user_id, email)
SELECT uuid as user_id, unnest(emails) AS email
FROM users
WHERE emails IS NOT NULL;

-- Drop the email column from the users table
ALTER TABLE users DROP COLUMN emails;
