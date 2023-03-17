insert into pretix_participants (email, name, role, residence)
values (${email}, ${name}, ${role}, ${residence})
on conflict do nothing;