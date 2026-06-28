-- ============================================================
-- Prospects (sales pipeline) — moved from the cold-email CLI.
-- Creates the table and loads the 34 seeded prospects.
--
-- Run this ONCE in Supabase: SQL Editor -> New query -> paste -> Run.
-- ============================================================

create table if not exists prospects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text,
  email text,
  contact text,
  phone text,
  website text,
  status text not null default 'new' check (status in ('new', 'contacted', 'replied')),
  contacted_at timestamptz,
  followup_date timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Same security model as the rest of Fieldr: RLS on, no public policies,
-- so only the backend (service-role key) can read or write.
alter table prospects enable row level security;

create trigger prospects_updated_at
  before update on prospects
  for each row execute function set_updated_at();

insert into prospects (name, type, email, contact, phone, website, status) values
  ('Ashbourne Fitness Centre', 'gym', 'info@ashbournefitness.ie', 'Dave', '+353 1 835 1100', 'ashbournefitness.ie', 'new'),
  ('Anytime Fitness Ashbourne', 'gym', 'ashbourne@anytimefitness.ie', 'Sarah', '+353 1 801 4422', 'anytimefitness.ie', 'new'),
  ('Iron House Gym', 'gym', 'hello@ironhousegym.ie', 'Mark', '+353 87 244 1190', 'ironhousegym.ie', 'new'),
  ('Body & Soul Gym', 'gym', 'info@bodyandsoulashbourne.ie', 'Linda', '+353 1 690 3321', 'bodyandsoulashbourne.ie', 'new'),
  ('CrossFit Ashbourne', 'gym', 'coach@crossfitashbourne.ie', 'Ronan', '+353 86 770 5512', 'crossfitashbourne.ie', 'new'),
  ('Killegland Health Club', 'gym', 'reception@killeglandhealth.ie', 'Aoife', '+353 1 835 9988', 'killeglandhealth.ie', 'new'),
  ('Ashbourne Motors', 'car_dealer', 'sales@ashbournemotors.ie', 'John', '+353 1 835 2200', 'ashbournemotors.ie', 'new'),
  ('Meath Car Sales', 'car_dealer', 'info@meathcarsales.ie', 'Pat', '+353 1 825 6677', 'meathcarsales.ie', 'new'),
  ('Boyne Valley Motors', 'car_dealer', 'sales@boynevalleymotors.ie', 'Ciaran', '+353 41 982 3344', 'boynevalleymotors.ie', 'new'),
  ('Premier Cars Ashbourne', 'car_dealer', 'info@premiercars.ie', 'Niall', '+353 1 690 1212', 'premiercars.ie', 'new'),
  ('Ashbourne Auto Centre', 'car_dealer', 'service@ashbourneauto.ie', 'Tom', '+353 1 835 4040', 'ashbourneauto.ie', 'new'),
  ('Killegland Garage', 'car_dealer', 'info@killeglandgarage.ie', 'Brian', '+353 1 835 7878', 'killeglandgarage.ie', 'new'),
  ('The Bistro Ashbourne', 'restaurant', 'bookings@thebistroashbourne.ie', 'Emma', '+353 1 835 3030', 'thebistroashbourne.ie', 'new'),
  ('Milano''s Restaurant', 'restaurant', 'info@milanosashbourne.ie', 'Marco', '+353 1 801 5566', 'milanosashbourne.ie', 'new'),
  ('The Hungry Monk', 'restaurant', 'eat@thehungrymonk.ie', 'Sinead', '+353 1 835 6161', 'thehungrymonk.ie', 'new'),
  ('Spice of India Ashbourne', 'restaurant', 'info@spiceofindia.ie', 'Raj', '+353 1 690 7788', 'spiceofindiaashbourne.ie', 'new'),
  ('Ashbourne Grill House', 'restaurant', 'bookings@ashbournegrill.ie', 'Steve', '+353 1 835 9090', 'ashbournegrill.ie', 'new'),
  ('The Olive Tree', 'restaurant', 'hello@olivetreeashbourne.ie', 'Maria', '+353 1 825 4545', 'olivetreeashbourne.ie', 'new'),
  ('Ashbourne Legal', 'solicitor', 'office@ashbournelegal.ie', 'Fiona', '+353 1 835 1818', 'ashbournelegal.ie', 'new'),
  ('Murphy & Co Solicitors', 'solicitor', 'info@murphysolicitors.ie', 'Declan', '+353 1 801 9090', 'murphysolicitors.ie', 'new'),
  ('Kelly Reid Solicitors', 'solicitor', 'reception@kellyreid.ie', 'Aisling', '+353 1 690 2323', 'kellyreid.ie', 'new'),
  ('Meath Law Partners', 'solicitor', 'info@meathlaw.ie', 'Gerard', '+353 1 835 4747', 'meathlaw.ie', 'new'),
  ('O''Brien Solicitors', 'solicitor', 'office@obriensolicitors.ie', 'Kate', '+353 1 825 6363', 'obriensolicitors.ie', 'new'),
  ('Ashbourne Accountancy', 'accountant', 'info@ashbourneaccountancy.ie', 'Paul', '+353 1 835 2727', 'ashbourneaccountancy.ie', 'new'),
  ('Boyne Financial', 'accountant', 'hello@boynefinancial.ie', 'Claire', '+353 41 982 8181', 'boynefinancial.ie', 'new'),
  ('Clarke & Associates', 'accountant', 'info@clarkeassociates.ie', 'Michael', '+353 1 690 5050', 'clarkeassociates.ie', 'new'),
  ('Meath Tax Advisors', 'accountant', 'advice@meathtax.ie', 'Orla', '+353 1 835 6868', 'meathtax.ie', 'new'),
  ('Prime Accounting Ashbourne', 'accountant', 'info@primeaccounting.ie', 'David', '+353 1 801 3737', 'primeaccounting.ie', 'new'),
  ('Glow Beauty Ashbourne', 'beauty_salon', 'hello@glowbeauty.ie', 'Rachel', '+353 1 835 9292', 'glowbeauty.ie', 'new'),
  ('The Beauty Room', 'beauty_salon', 'bookings@thebeautyroom.ie', 'Megan', '+353 1 690 8484', 'thebeautyroomashbourne.ie', 'new'),
  ('Bellissimo Salon', 'beauty_salon', 'info@bellissimosalon.ie', 'Gina', '+353 1 835 1515', 'bellissimosalon.ie', 'new'),
  ('Serenity Spa Ashbourne', 'beauty_salon', 'relax@serenityspa.ie', 'Holly', '+353 1 825 7373', 'serenityspaashbourne.ie', 'new'),
  ('Pure Beauty', 'beauty_salon', 'hello@purebeauty.ie', 'Chloe', '+353 1 801 6464', 'purebeautyashbourne.ie', 'new'),
  ('Lavish Hair & Beauty', 'beauty_salon', 'info@lavishhairbeauty.ie', 'Sophie', '+353 1 835 3838', 'lavishhairbeauty.ie', 'new');
