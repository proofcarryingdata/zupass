alter table commitments 
add column account_reset_timestamps timestamp[] 
not null default array[]::timestamp[];