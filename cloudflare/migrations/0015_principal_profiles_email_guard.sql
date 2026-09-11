-- Profile email is the immutable mirror key linking one roster owner.
CREATE TRIGGER principal_profiles_no_email_change
BEFORE UPDATE OF email ON principal_profiles
BEGIN
  SELECT RAISE(ABORT, 'principal profile email is immutable');
END;
