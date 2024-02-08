-- ensure that email addresses we record for Podbox users is normalized
update generic_issuance_users set email = LOWER(email);
