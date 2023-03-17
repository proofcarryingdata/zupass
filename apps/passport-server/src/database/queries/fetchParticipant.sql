select 
    commitment,
    name,
    email,
    role,
    residence
from commitments c
join pretix_participants p on c.participant_email=p.email
where c.uuid = ${uuid};