export const POLE_ISLAND = {
  latitude: 43.72,
  longitude: -70.15,
  elevationMeters: 5,
  label: 'Casco Bay, Maine',
} as const;

// Lightman's book does not name the island or give the date of the night
// described. This is a placeholder mid-August, moonless, wee-hours moment
// at a plausible Casco Bay location, to be refined once we can narrow down
// the island and date more precisely.
export const REFERENCE_MOMENT = '2015-08-12T05:30:00Z';
