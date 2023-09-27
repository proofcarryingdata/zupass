CREATE TABLE known_public_keys (
  public_key_name VARCHAR NOT NULL,
  public_key_type VARCHAR NOT NULL,
  public_key VARCHAR NOT NULL UNIQUE,
  PRIMARY KEY(public_key_name, public_key_type)
);

CREATE TABLE known_ticket_types (
  identifier VARCHAR NOT NULL UNIQUE,
  event_id VARCHAR NOT NULL,
  product_id VARCHAR NOT NULL UNIQUE,
  known_public_key_name VARCHAR NOT NULL,
  known_public_key_type VARCHAR NOT NULL,
  ticket_group VARCHAR NOT NULL,
  FOREIGN KEY(known_public_key_name, known_public_key_type)
  REFERENCES known_public_keys (public_key_name, public_key_type),
  PRIMARY KEY(identifier)
);

CREATE UNIQUE INDEX known_ticket_type_details ON known_ticket_types (event_id, product_id, known_public_key_name, known_public_key_type); 
