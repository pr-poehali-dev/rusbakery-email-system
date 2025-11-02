CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100),
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'worker')),
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    is_broadcast BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE message_recipients (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id),
    to_user_id INTEGER NOT NULL REFERENCES users(id),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    UNIQUE(message_id, to_user_id)
);

CREATE INDEX idx_messages_from_user ON messages(from_user_id);
CREATE INDEX idx_message_recipients_to_user ON message_recipients(to_user_id);
CREATE INDEX idx_message_recipients_message ON message_recipients(message_id);

INSERT INTO users (email, password, first_name, last_name, display_name, role, is_online) 
VALUES ('skzry@RusBakery', '568876Qqq', 'Администратор', 'RusBakery', 'Администратор', 'owner', true);
