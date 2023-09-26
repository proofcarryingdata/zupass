alter table commitments 
add column accountResetTimestamps timestamp[] 
not null default array[]::timestamp[];