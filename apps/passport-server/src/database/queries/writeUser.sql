update users
set encrypted_blob = ${new_encrypted_blob}, updated_at = NOW()
where identifier = ${searched_identifier} AND server_password = ${claimed_server_password};
