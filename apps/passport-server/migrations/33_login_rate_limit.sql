alter table commitments 
add column account_reset_timestamps timestamptz[] 
not null default array[]::timestamptz[];
