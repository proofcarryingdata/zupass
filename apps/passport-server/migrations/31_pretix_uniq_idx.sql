ALTER TABLE
    "public"."pretix_events_config"
ADD
    UNIQUE ("event_id");

ALTER TABLE
    "public"."devconnect_pretix_events_info"
ADD
    UNIQUE ("pretix_events_config_id");

ALTER TABLE
    "public"."devconnect_pretix_items_info"
ADD
    UNIQUE ("item_id", "devconnect_pretix_events_info_id");