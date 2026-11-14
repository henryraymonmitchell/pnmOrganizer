insert into public.chapters (name, short_name, primary_color, secondary_color)
values
  ('Alpha Epsilon Pi', 'AΕΠ', '#0e5b9a', '#f8c629'),
  ('Alpha Sigma Phi', 'ΑΣΦ', '#cf1530', '#929ba0'),
  ('Beta Theta Pi', 'ΒΘΠ', '#142d60', '#ffffff'),
  ('Delta Chi', 'ΔΧ', '#e0062f', '#ffd34e'),
  ('Delta Sigma Phi', 'ΔΣΦ', '#008f3b', '#ffd300'),
  ('Delta Upsilon', 'ΔΥ', '#2f619b', '#ffce47'),
  ('Kappa Sigma', 'ΚΣ', '#be0d3d', '#ffffff'),
  ('Lambda Chi Alpha', 'ΛΧΑ', '#00733e', '#dca82c'),
  ('Phi Delta Theta', 'ΦΔΘ', '#192b5f', '#d9b56d'),
  ('Phi Gamma Delta', 'FIJI', '#48206f', '#ffffff'),
  ('Phi Kappa Psi', 'ΦΚΨ', '#f2a821', '#171717'),
  ('Phi Sigma Kappa', 'ΦΣΚ', '#c8143b', '#d6d6d6'),
  ('Pi Kappa Phi', 'ΠΚΦ', '#00529b', '#e2ad2e'),
  ('Sigma Nu', 'ΣΝ', '#b29a66', '#ffffff'),
  ('Sigma Phi Epsilon', 'ΣΦΕ', '#70399a', '#ffffff'),
  ('Sigma Pi', 'ΣΠ', '#4c466f', '#ffffff'),
  ('Theta Chi', 'ΘΧ', '#da1830', '#ffffff'),
  ('Zeta Beta Tau', 'ΖΒΤ', '#103b62', '#ffcc19'),
  ('Pi Kappa Alpha', 'ΠΚΑ', '#84202c', '#ffffff')
on conflict (name) do update set
  short_name = excluded.short_name,
  primary_color = excluded.primary_color,
  secondary_color = excluded.secondary_color,
  is_active = true;
