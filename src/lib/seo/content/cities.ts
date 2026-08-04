import type { CityDef } from "@/lib/seo/types";
import type { IndustryDef } from "@/lib/seo/content/industries";
import type { SeoSection } from "@/lib/seo/types";

export const SEO_CITIES: CityDef[] = [
  {
    slug: "lagos",
    name: "Lagos",
    country: "Nigeria",
    marketNote:
      "Lagos is dense, mobile-first, and competitive. Customers discover on Instagram and WhatsApp, then expect a fast link with prices and prepaid checkout — not a week of back-and-forth before payment.",
    sellingNote:
      "Neighbourhood delivery, island–mainland logistics, and traffic-aware fulfilment promises matter as much as product photos. Spell out areas you serve and typical timelines on your FAQ page.",
  },
  {
    slug: "abuja",
    name: "Abuja",
    country: "Nigeria",
    marketNote:
      "Abuja buyers often skew toward professional and gift-led purchases. Clear branding, reliable delivery messaging, and Paystack checkout help you look established — even if you are a lean team.",
    sellingNote:
      "Corporate gifting, office-adjacent pickup, and weekend residential delivery are common patterns. Publish contact details and service areas so customers do not have to hunt for them in chat history.",
  },
  {
    slug: "port-harcourt",
    name: "Port Harcourt",
    country: "Nigeria",
    marketNote:
      "Port Harcourt commerce mixes strong local loyalty with WhatsApp-native buying. A branded storefront helps you look consistent when customers compare you to larger city shops online.",
    sellingNote:
      "Be explicit about delivery coverage within the city and surrounding areas. Prepaid orders reduce fuel-wasting failed drop-offs.",
  },
  {
    slug: "ibadan",
    name: "Ibadan",
    country: "Nigeria",
    marketNote:
      "Ibadan sellers win with community trust and practical pricing. An online catalog extends that trust beyond the people who can visit your physical spot the same day.",
    sellingNote:
      "Lead with bestsellers and bundles. Keep fulfilment promises conservative and clear — reliability builds repeat neighbourhood orders.",
  },
  {
    slug: "nairobi",
    name: "Nairobi",
    country: "Kenya",
    marketNote:
      "Nairobi shoppers are comfortable buying online when listings look professional. A clean Bizgrid storefront with clear pricing helps you compete with more polished regional brands.",
    sellingNote:
      "Mobile performance and delivery clarity matter. Pair WhatsApp support with a self-serve catalog so inquiries become qualified, not tedious.",
  },
  {
    slug: "accra",
    name: "Accra",
    country: "Ghana",
    marketNote:
      "Accra’s creator and SME scene is active on social, but customers still convert better when there is a dedicated place to browse and pay. Your storefront is that destination.",
    sellingNote:
      "Publish honest delivery timelines across Accra neighbourhoods and use FAQs for payment and pickup rules. Share one link across Instagram, TikTok, and WhatsApp Status.",
  },
];

export function buildIndustryCitySections(
  industry: IndustryDef,
  city: CityDef,
): { intro: string; sections: SeoSection[] } {
  const intro = `Run a ${industry.name.toLowerCase()} business in ${city.name}? Customers already message you on WhatsApp and find you on Instagram — what they need next is a clear catalog, honest fulfilment rules, and prepaid checkout. Bizgrid helps you publish that storefront for ${city.name}, ${city.country}, without hiring a developer.`;

  const sections: SeoSection[] = [
    {
      heading: `Selling ${industry.pluralLabel} in ${city.name}`,
      body: [
        city.marketNote,
        industry.cityHook,
        `A Bizgrid storefront gives ${industry.pluralLabel} in ${city.name} a permanent home for pricing, proof, and prepaid orders — while you keep using WhatsApp for relationship and support.`,
      ],
    },
    {
      heading: `What ${city.name} customers expect before they pay`,
      body: [
        city.sellingNote,
        `For ${industry.pluralLabel}, that usually means clear photos, honest descriptions, delivery or pickup rules, and a payment flow they recognise. Vague “DM for price” culture creates high chat volume and low close rates. Product pages fix that.`,
        `Use your FAQ for the questions you answer every day in ${city.name} — areas you deliver to, how long preparation or dispatch takes, and what happens if an item is unavailable.`,
      ],
    },
    {
      heading: `What to put on your ${industry.name.toLowerCase()} site`,
      body: [
        `Start with offerings that already sell: ${industry.whatToSell.slice(0, 3).join("; ")}. Add more only after the first listings convert.`,
        `Include an About page (why customers should trust you), Contact details for ${city.name}, and related products so shoppers discover more without another message thread.`,
        industry.sections[0]?.body[0] ??
          `Focus on clarity first — customers in ${city.name} reward stores that make it easy to browse and pay.`,
      ],
    },
    {
      heading: `How to launch in ${city.name} this week`,
      body: [
        `1) Sign up on Bizgrid and describe your ${industry.name.toLowerCase()} business, mentioning ${city.name} so the draft can reflect local tone. 2) Add your first products with real prices. 3) Write three FAQs about delivery and payment. 4) Publish and put the link on WhatsApp Business profile, Instagram bio, and Google Business Profile if you have one.`,
        `5) Share the link in the community channels you already use in ${city.name}. 6) Fulfil prepaid orders carefully — early reviews and repeat buyers matter more than a perfect design.`,
        `When you want local discovery, join the Bizgrid directory for ${industry.pluralLabel} in ${city.name} and keep your storefront published so shoppers can find you.`,
      ],
    },
  ];

  // Append deeper industry guidance (skip the first section already summarised above)
  for (const section of industry.sections.slice(1)) {
    sections.push(section);
  }

  return { intro, sections };
}
