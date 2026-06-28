// seed.js — the 34 Ashbourne (Co. Meath) prospects, pre-loaded on first run.
//
// NOTE: contact details below are realistic placeholders so the tool works out
// of the box. Verify each email / phone against the business's website or
// Google Business listing before you actually send anything. Cold-emailing a
// wrong or scraped address is the fastest way to get marked as spam.

module.exports = [
  // ---------------------------------------------------------------- GYMS (6)
  { name: "Ashbourne Fitness Centre", type: "gym", email: "info@ashbournefitness.ie", contact: "Dave", phone: "+353 1 835 1100", website: "ashbournefitness.ie" },
  { name: "Anytime Fitness Ashbourne", type: "gym", email: "ashbourne@anytimefitness.ie", contact: "Sarah", phone: "+353 1 801 4422", website: "anytimefitness.ie" },
  { name: "Iron House Gym", type: "gym", email: "hello@ironhousegym.ie", contact: "Mark", phone: "+353 87 244 1190", website: "ironhousegym.ie" },
  { name: "Body & Soul Gym", type: "gym", email: "info@bodyandsoulashbourne.ie", contact: "Linda", phone: "+353 1 690 3321", website: "bodyandsoulashbourne.ie" },
  { name: "CrossFit Ashbourne", type: "gym", email: "coach@crossfitashbourne.ie", contact: "Ronan", phone: "+353 86 770 5512", website: "crossfitashbourne.ie" },
  { name: "Killegland Health Club", type: "gym", email: "reception@killeglandhealth.ie", contact: "Aoife", phone: "+353 1 835 9988", website: "killeglandhealth.ie" },

  // --------------------------------------------------------- CAR DEALERS (6)
  { name: "Ashbourne Motors", type: "car_dealer", email: "sales@ashbournemotors.ie", contact: "John", phone: "+353 1 835 2200", website: "ashbournemotors.ie" },
  { name: "Meath Car Sales", type: "car_dealer", email: "info@meathcarsales.ie", contact: "Pat", phone: "+353 1 825 6677", website: "meathcarsales.ie" },
  { name: "Boyne Valley Motors", type: "car_dealer", email: "sales@boynevalleymotors.ie", contact: "Ciaran", phone: "+353 41 982 3344", website: "boynevalleymotors.ie" },
  { name: "Premier Cars Ashbourne", type: "car_dealer", email: "info@premiercars.ie", contact: "Niall", phone: "+353 1 690 1212", website: "premiercars.ie" },
  { name: "Ashbourne Auto Centre", type: "car_dealer", email: "service@ashbourneauto.ie", contact: "Tom", phone: "+353 1 835 4040", website: "ashbourneauto.ie" },
  { name: "Killegland Garage", type: "car_dealer", email: "info@killeglandgarage.ie", contact: "Brian", phone: "+353 1 835 7878", website: "killeglandgarage.ie" },

  // ---------------------------------------------------------- RESTAURANTS (6)
  { name: "The Bistro Ashbourne", type: "restaurant", email: "bookings@thebistroashbourne.ie", contact: "Emma", phone: "+353 1 835 3030", website: "thebistroashbourne.ie" },
  { name: "Milano's Restaurant", type: "restaurant", email: "info@milanosashbourne.ie", contact: "Marco", phone: "+353 1 801 5566", website: "milanosashbourne.ie" },
  { name: "The Hungry Monk", type: "restaurant", email: "eat@thehungrymonk.ie", contact: "Sinead", phone: "+353 1 835 6161", website: "thehungrymonk.ie" },
  { name: "Spice of India Ashbourne", type: "restaurant", email: "info@spiceofindia.ie", contact: "Raj", phone: "+353 1 690 7788", website: "spiceofindiaashbourne.ie" },
  { name: "Ashbourne Grill House", type: "restaurant", email: "bookings@ashbournegrill.ie", contact: "Steve", phone: "+353 1 835 9090", website: "ashbournegrill.ie" },
  { name: "The Olive Tree", type: "restaurant", email: "hello@olivetreeashbourne.ie", contact: "Maria", phone: "+353 1 825 4545", website: "olivetreeashbourne.ie" },

  // ----------------------------------------------------------- SOLICITORS (5)
  { name: "Ashbourne Legal", type: "solicitor", email: "office@ashbournelegal.ie", contact: "Fiona", phone: "+353 1 835 1818", website: "ashbournelegal.ie" },
  { name: "Murphy & Co Solicitors", type: "solicitor", email: "info@murphysolicitors.ie", contact: "Declan", phone: "+353 1 801 9090", website: "murphysolicitors.ie" },
  { name: "Kelly Reid Solicitors", type: "solicitor", email: "reception@kellyreid.ie", contact: "Aisling", phone: "+353 1 690 2323", website: "kellyreid.ie" },
  { name: "Meath Law Partners", type: "solicitor", email: "info@meathlaw.ie", contact: "Gerard", phone: "+353 1 835 4747", website: "meathlaw.ie" },
  { name: "O'Brien Solicitors", type: "solicitor", email: "office@obriensolicitors.ie", contact: "Kate", phone: "+353 1 825 6363", website: "obriensolicitors.ie" },

  // ---------------------------------------------------------- ACCOUNTANTS (5)
  { name: "Ashbourne Accountancy", type: "accountant", email: "info@ashbourneaccountancy.ie", contact: "Paul", phone: "+353 1 835 2727", website: "ashbourneaccountancy.ie" },
  { name: "Boyne Financial", type: "accountant", email: "hello@boynefinancial.ie", contact: "Claire", phone: "+353 41 982 8181", website: "boynefinancial.ie" },
  { name: "Clarke & Associates", type: "accountant", email: "info@clarkeassociates.ie", contact: "Michael", phone: "+353 1 690 5050", website: "clarkeassociates.ie" },
  { name: "Meath Tax Advisors", type: "accountant", email: "advice@meathtax.ie", contact: "Orla", phone: "+353 1 835 6868", website: "meathtax.ie" },
  { name: "Prime Accounting Ashbourne", type: "accountant", email: "info@primeaccounting.ie", contact: "David", phone: "+353 1 801 3737", website: "primeaccounting.ie" },

  // -------------------------------------------------------- BEAUTY SALONS (6)
  { name: "Glow Beauty Ashbourne", type: "beauty_salon", email: "hello@glowbeauty.ie", contact: "Rachel", phone: "+353 1 835 9292", website: "glowbeauty.ie" },
  { name: "The Beauty Room", type: "beauty_salon", email: "bookings@thebeautyroom.ie", contact: "Megan", phone: "+353 1 690 8484", website: "thebeautyroomashbourne.ie" },
  { name: "Bellissimo Salon", type: "beauty_salon", email: "info@bellissimosalon.ie", contact: "Gina", phone: "+353 1 835 1515", website: "bellissimosalon.ie" },
  { name: "Serenity Spa Ashbourne", type: "beauty_salon", email: "relax@serenityspa.ie", contact: "Holly", phone: "+353 1 825 7373", website: "serenityspaashbourne.ie" },
  { name: "Pure Beauty", type: "beauty_salon", email: "hello@purebeauty.ie", contact: "Chloe", phone: "+353 1 801 6464", website: "purebeautyashbourne.ie" },
  { name: "Lavish Hair & Beauty", type: "beauty_salon", email: "info@lavishhairbeauty.ie", contact: "Sophie", phone: "+353 1 835 3838", website: "lavishhairbeauty.ie" },
];
