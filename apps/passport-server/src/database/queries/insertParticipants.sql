insert into pretix_participants (email, name, role, residence, order_id)
values (${email}, ${name}, ${role}, ${residence}, ${orderId})
on conflict do nothing;