import type { FaqItem, SeoSection } from "@/lib/seo/types";
import { PLATFORM_FAQS } from "@/lib/seo/platform-faqs";

export type IndustryDef = {
  slug: string;
  name: string;
  pluralLabel: string;
  industryKey:
    | "food_and_beverage"
    | "fashion_and_apparel"
    | "beauty_and_skincare"
    | "electronics"
    | "home_and_living"
    | "services"
    | "other";
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  sections: SeoSection[];
  faqs: FaqItem[];
  /** Extra copy hooks used on city pages */
  cityHook: string;
  whatToSell: string[];
};

export const SEO_INDUSTRIES: IndustryDef[] = [
  {
    slug: "restaurants",
    name: "Restaurants",
    pluralLabel: "restaurants",
    industryKey: "food_and_beverage",
    metaTitle: "Restaurant Website Builder | Bizgrid",
    metaDescription:
      "Build a restaurant website and online menu with Bizgrid. Take prepaid orders, accept Paystack payments, and share your store on WhatsApp.",
    h1: "Restaurant Website Builder for African Food Businesses",
    intro:
      "Most restaurants already take orders on WhatsApp — the gap is a clean place to show the menu, prices, and take prepaid payment. Bizgrid gives you that storefront in minutes, without hiring a developer.",
    cityHook:
      "Food buyers in major African cities decide fast. A mobile-friendly menu with clear prices and Paystack checkout beats endless photo dumps in a chat.",
    whatToSell: [
      "Signature dishes and combo meals as products",
      "Drinks, sides, and add-ons as separate items",
      "Event catering packages with deposit pricing",
      "Merch or branded items if you offer them",
    ],
    sections: [
      {
        heading: "Why Instagram alone is not enough for restaurants",
        body: [
          "Instagram and TikTok are excellent for discovery — a plated jollof shot or grill night reel can drive attention overnight. But when a hungry customer is ready to order, they need something more stable than a disappearing story: today’s menu, portion sizes, prices, delivery or pickup rules, and a way to pay without chasing invoices in chat.",
          "That friction is expensive. Staff waste time confirming the same questions. Orders get mixed up because prices changed in a caption three weeks ago. Guests abandon the order when payment feels informal. A dedicated restaurant website fixes the “where do I actually order?” problem while you keep using social for marketing.",
          "Bizgrid is built for this workflow. You describe your restaurant — cuisine, vibe, what you sell — and get a branded storefront you can refine in plain language. Then you publish menu items as products, share one link on WhatsApp Status or your Google Business Profile, and take orders through a checkout customers already trust via Paystack.",
        ],
      },
      {
        heading: "What a strong restaurant website includes",
        body: [
          "Lead with appetite and clarity. Feature a handful of bestsellers on the homepage, then organise the full menu into categories guests recognise — mains, sides, drinks, desserts, or lunch vs dinner. Every dish should have a real photo when you have one, an honest description, and a price in the currency you actually charge.",
          "Add an About page that tells your story in a few sentences, a Contact page with phone and address, and an FAQ covering opening hours, delivery areas, minimum order values, and how long preparation usually takes. Those answers stop repetitive WhatsApp questions and improve the chance of appearing in AI search summaries that pull FAQ content.",
          "On Bizgrid you also get cart and checkout, order visibility in your dashboard, and growth tools for follow-ups — including abandoned-cart recovery for guests who browsed the menu then dropped off. That is the difference between a pretty brochure site and a restaurant that can take prepaid demand.",
        ],
      },
      {
        heading: "How restaurants use Bizgrid day to day",
        body: [
          "Morning: update sold-out dishes or add a daily special as a product. Afternoon: share the store link in WhatsApp broadcasts or status. Evening: fulfil paid orders with less back-and-forth on price confirmation. Weekend: push a promo code or discounted combo for slow hours.",
          "Because the storefront is yours, you are not trapped inside a marketplace algorithm. You can still list on delivery apps if you want — but your own site becomes the owned destination for loyal guests, corporate orders, and customers who prefer paying before food leaves the kitchen.",
        ],
      },
      {
        heading: "Launch checklist for food businesses",
        body: [
          "1) Sign up and describe your restaurant in chat — cuisine, city, and brand feel. 2) Review the AI-generated storefront and tweak headlines. 3) Add 8–20 menu items with prices. 4) Write three FAQ answers (hours, delivery, payment). 5) Publish and put the link in your Instagram bio, WhatsApp business profile, and Google listing.",
          "You do not need a perfect photo shoot on day one. Publish with what you have, take prepaid orders, then improve photos and copy as you grow. Speed to a working menu link usually beats waiting for a perfect redesign.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I sell food online with Bizgrid?",
        answer:
          "Yes. List menu items as products with prices, publish your storefront, and take Paystack payments for delivery or pickup orders. You manage fulfilment from your kitchen or restaurant as you already do.",
      },
      {
        question: "Can customers see my location and hours?",
        answer:
          "Yes. Use About, Contact, and FAQ pages to publish address, phone, opening hours, and delivery-area rules so guests stop asking the same questions in chat.",
      },
      {
        question: "Do I need a developer to update my menu?",
        answer:
          "No. Add or edit products from your dashboard, or ask Bizgrid’s AI chat to refine copy and layout. Menu changes can go live without waiting on an agency.",
      },
      {
        question: "Is Bizgrid only for fine dining?",
        answer:
          "No. It works for casual spots, cloud kitchens, grills, juice bars, and full-service restaurants — anyone who needs a clear menu and prepaid checkout.",
      },
    ],
  },
  {
    slug: "fashion-stores",
    name: "Fashion Stores",
    pluralLabel: "fashion stores",
    industryKey: "fashion_and_apparel",
    metaTitle: "Fashion Website Builder | Bizgrid",
    metaDescription:
      "Create a fashion store website with AI. Showcase collections, sizes, and photos — then take Paystack payments and sell via WhatsApp with Bizgrid.",
    h1: "Website Builder for Fashion Stores",
    intro:
      "Fashion sells on trust and taste. Bizgrid helps you launch a lookbook-ready storefront — collections, product pages, and checkout — so Instagram DMs become paid orders instead of endless size questions.",
    cityHook:
      "City fashion shoppers compare fits, fabrics, and delivery promises before they pay. A proper product page with photos and checkout outperforms screenshot threads.",
    whatToSell: [
      "Ready-to-wear pieces with size guidance",
      "Limited drops and seasonal collections",
      "Accessories and add-on items",
      "Made-to-measure deposits where relevant",
    ],
    sections: [
      {
        heading: "The fashion seller’s real problem",
        body: [
          "If you sell clothing in Africa today, your customers probably found you on Instagram or TikTok. That works for demand — until every sale requires a private chat, a size chart explanation, proof of fabric, and a bank transfer confirmation. Scale breaks that model. One viral post can create more DMs than you can answer well.",
          "A fashion website does not replace social. It closes the loop. Shoppers browse collections on their own time, check sizes, read delivery FAQs, and pay with Paystack. You answer edge-case questions in WhatsApp and send product links for the rest. That is how serious fashion brands grow past “reply guy” operations.",
        ],
      },
      {
        heading: "What your fashion storefront should show",
        body: [
          "Lead with brand feeling — editorial photography if you have it, clean product cards if you are starting lean. Group items into collections shoppers understand: new arrivals, best sellers, occasion wear, menswear, kids. Every product page needs multiple angles when possible, price, size options, and a short description of fabric and fit.",
          "Add an FAQ for returns/exchanges, delivery timelines, and how made-to-order works if you offer it. Related products matter in fashion: someone buying a blazer should see matching trousers or shoes without hunting. Bizgrid storefronts support catalogs, FAQs, and growth follow-ups so you can recover carts from people who almost bought the dress.",
        ],
      },
      {
        heading: "Built for how African fashion shops actually sell",
        body: [
          "Payments hub around rails customers trust. Bizgrid centres Paystack so Nigerian and regional buyers can complete checkout without a foreign-card friction story. You can still nurture demand on WhatsApp, Status, and Instagram — the difference is you send a product URL with stock and price instead of negotiating every order from scratch.",
          "As you grow, custom domains on Growth and Scale plans let the store live on yourbrand.com. That looks credible for collaborations, pop-ups, and wholesale inquiries. Until then, a Bizgrid subdomain is enough to start taking prepaid fashion orders this week.",
        ],
      },
      {
        heading: "How to launch a fashion store on Bizgrid",
        body: [
          "Describe your brand in chat: aesthetic, audience, and what you sell. Review the AI draft. Upload your best 10–30 products first — quality beats a thin catalog of 200 incomplete listings. Write three FAQs. Publish. Put the link in bio and pin it in WhatsApp.",
          "Then improve weekly: better photos, clearer size notes, more reviews. Fashion brands win on continuous refinement, not a one-time agency launch that goes stale.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I upload clothing photos and galleries?",
        answer:
          "Yes. Add cover images and galleries so shoppers can inspect fabric, fit, and details before buying.",
      },
      {
        question: "Can I sell with size variants?",
        answer:
          "Yes. Use product variants for sizes and options so customers choose correctly at checkout instead of clarifying in chat.",
      },
      {
        question: "Does Bizgrid work for thrift and bespoke fashion?",
        answer:
          "Yes. Thrift sellers can list unique pieces; bespoke sellers can take deposits via product pricing and explain process in FAQs and About pages.",
      },
      ...PLATFORM_FAQS.slice(0, 2),
    ],
  },
  {
    slug: "beauty-brands",
    name: "Cosmetics & Beauty",
    pluralLabel: "cosmetics and beauty brands",
    industryKey: "beauty_and_skincare",
    metaTitle: "Cosmetics & Beauty Website Builder | Bizgrid",
    metaDescription:
      "Build a cosmetics, skincare, and beauty store with Bizgrid. Share routines, ingredients context, and FAQs — then sell with Paystack checkout.",
    h1: "Website Builder for Cosmetics & Beauty Brands",
    intro:
      "Beauty and cosmetics customers buy trust. Bizgrid helps skincare, makeup, and beauty brands publish a polished store — product education, FAQs, reviews, and payments — without waiting on an agency redesign.",
    cityHook:
      "In competitive city beauty markets, clear routines, ingredient honesty, and prepaid checkout separate serious brands from generic product flippers.",
    whatToSell: [
      "Skincare routines and kits",
      "Makeup and cosmetics with shade guidance",
      "Haircare and body care lines",
      "Gift sets and bundles",
    ],
    sections: [
      {
        heading: "Why cosmetics brands need more than a supplier catalog",
        body: [
          "Beauty shoppers ask: Will this work for my skin? Is this authentic? How do I use it? What is the return policy? A marketplace listing or Instagram carousel rarely answers those well. Your own storefront can: educate first, sell second.",
          "Bizgrid generates a beauty-ready site from your brand description, then lets you refine tone in chat. You publish products with honest descriptions, add FAQs for sensitive-skin questions and shipping of liquids, and collect reviews so social proof compounds over time.",
        ],
      },
      {
        heading: "Content that converts beauty shoppers",
        body: [
          "Structure product pages around outcome + how to use + who it is for. Bundles and routines convert better than isolated SKUs because they reduce decision fatigue. Use related products to move someone from cleanser to moisturiser — or foundation to primer — without another WhatsApp round trip.",
          "Keep a living FAQ: patch tests, expiry, shade matching, fragrance-free options, delivery for heat-sensitive items. Those answers also make your brand easier for AI assistants and Google to summarise accurately — useful when people ask “best place to buy X online” in chat tools.",
        ],
      },
      {
        heading: "Payments, authenticity, and operations",
        body: [
          "Prepaid Paystack checkout reduces fake orders and “I will pay on delivery” no-shows that hurt beauty inventory planning. Pair that with clear confirmation messaging so customers feel the purchase was official.",
          "Operate from one dashboard: products, discounts, orders, and follow-ups. When someone abandons a cart with a serum kit, recovery messaging can bring them back — something screenshot-selling rarely does systematically.",
        ],
      },
      {
        heading: "Launch path for beauty founders",
        body: [
          "Start with your hero line (even 5–12 SKUs). Generate the Bizgrid storefront, polish the brand story, publish FAQs, enable payments, and drive traffic from Instagram and WhatsApp into owned product pages. Expand the catalog only after the first SKUs convert cleanly.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I explain ingredients and routines on Bizgrid?",
        answer:
          "Yes. Use product descriptions, About content, and FAQ pages to educate shoppers before checkout — that trust is essential in beauty and cosmetics.",
      },
      {
        question: "Do product reviews work on Bizgrid storefronts?",
        answer:
          "Yes. Customer reviews help shoppers evaluate products and can power AggregateRating structured data when ratings exist.",
      },
      ...PLATFORM_FAQS.slice(0, 3),
    ],
  },
  {
    slug: "pharmacies",
    name: "Pharmacies",
    pluralLabel: "pharmacies",
    industryKey: "other",
    metaTitle: "Pharmacy Website Builder | Bizgrid",
    metaDescription:
      "Build a pharmacy or drugstore website with Bizgrid. List OTC products, publish store hours and location, and take prepaid Paystack orders.",
    h1: "Website Builder for Pharmacies",
    intro:
      "Customers need clear stock info, hours, and a trustworthy place to order everyday health products. Bizgrid helps pharmacies publish a clean online catalog with prepaid checkout — without a custom development project.",
    cityHook:
      "City pharmacy shoppers want speed and clarity: what is in stock, where to pick up, and how to pay. A proper product page beats forwarding price lists in WhatsApp every morning.",
    whatToSell: [
      "Over-the-counter medications and first-aid",
      "Vitamins, wellness, and personal care",
      "Baby care and hygiene essentials",
      "Health device accessories and refill packs",
    ],
    sections: [
      {
        heading: "Make neighbourhood pharmacy trust visible online",
        body: [
          "People already know to call or WhatsApp their chemist — but that does not scale when demand spikes, staff are busy, or customers want to reorder vitamins without a long thread. A Bizgrid pharmacy storefront gives you a permanent catalog with prices, photos, and fulfilment rules.",
          "Stay in your lane legally: list products you are allowed to sell online and use FAQs for prescription guidance (for example, directing customers to call or visit for regulated items). Clarity builds trust and keeps expectations honest.",
        ],
      },
      {
        heading: "What a strong pharmacy website includes",
        body: [
          "Lead with fast-moving OTC and wellness products. Group by need — cold & flu, vitamins, baby care, personal care — so shoppers self-serve. Every listing should have a clear name, pack size, and price. Related products help attach accessories or complementary care items.",
          "Publish Contact details with address and map pin, opening hours, and delivery or pickup FAQs. That information reduces the same five questions your counter staff answer all day — and helps you show up for “pharmacy near me” style research that ends online.",
        ],
      },
      {
        heading: "Prepaid orders that protect inventory",
        body: [
          "Paystack checkout confirms serious demand before a rider leaves or a shelf is reserved. Pair that with clear messaging for same-day pickup windows and delivery radii. Abandoned-cart follow-ups can recover customers who browsed pain relief or baby essentials then dropped off.",
          "Share one store link on WhatsApp Status, Google Business Profile, and patient reminder broadcasts. You stay the trusted local pharmacy — with a modern ordering path.",
        ],
      },
      {
        heading: "Launch checklist for pharmacies",
        body: [
          "1) Describe your pharmacy and neighbourhood in Bizgrid chat. 2) Add 15–40 best-selling OTC and wellness SKUs. 3) Write FAQs for hours, pickup, delivery areas, and which items need in-store consultation. 4) Publish and put the link in your WhatsApp business profile and storefront signage.",
          "Improve weekly: better product photos, clearer pack sizes, and bundles for common household needs. Reliability beats a giant incomplete catalog.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can a pharmacy sell online with Bizgrid?",
        answer:
          "Yes. List the OTC and wellness products you are allowed to sell, publish prices, and take Paystack payments for pickup or delivery. Use FAQs to direct prescription needs to the appropriate in-store or phone process.",
      },
      {
        question: "Can I show opening hours and location?",
        answer:
          "Yes. Use About, Contact, and FAQ pages for address, phone, hours, and delivery rules so customers stop asking the same questions in chat.",
      },
      {
        question: "Does Bizgrid work for small neighbourhood pharmacies?",
        answer:
          "Yes. Start with your top sellers, keep fulfilment promises clear, and grow the catalog as online reorder demand proves itself.",
      },
      ...PLATFORM_FAQS.slice(0, 2),
    ],
  },
  {
    slug: "barbers",
    name: "Barbers",
    pluralLabel: "barber shops",
    industryKey: "services",
    metaTitle: "Barber Website Builder | Bizgrid",
    metaDescription:
      "Create a barber shop website with Bizgrid. Showcase cuts, sell grooming products, and let clients reach you without hunting through chat history.",
    h1: "Website Builder for Barbers",
    intro:
      "Your chairs fill when clients can find you, trust your work, and buy products without friction. Bizgrid gives barbers a sharp online home — services story, product shelf, and a shareable link for WhatsApp.",
    cityHook:
      "City clients search for reputable barbers fast. A clean site with photos, location details, and product checkout beats hoping they remember your personal WhatsApp number.",
    whatToSell: [
      "Grooming products and aftercare",
      "Gift cards or package deals as products",
      "Branded merch",
      "Appointment CTAs via Contact and WhatsApp",
    ],
    sections: [
      {
        heading: "Stop being only as discoverable as your last status",
        body: [
          "Many barbershops run entirely on referrals and WhatsApp. That works until a client loses your number, a competitor looks more professional online, or you want to sell pomade and beard oil without personally invoicing every bottle.",
          "A simple Bizgrid site makes you findable and credible: show your space and cuts, explain how booking works, list walk-in vs appointment rules, and sell retail products with Paystack. Clients share one link — not a fragile chat thread.",
        ],
      },
      {
        heading: "What to put on a barber website",
        body: [
          "Homepage: who you are and what makes the shop worth the trip. About: barbers, specialties, and vibe. Products: retail that matches your service. FAQ: pricing ranges, late policies, kids cuts, location parking. Contact: phone, map pin, and hours.",
          "You do not need a complex booking engine on day one. Many shops convert by publishing clear hours and a WhatsApp CTA while selling products and gift packages online. Improve booking flows later once retail and discovery are working.",
        ],
      },
      {
        heading: "How Bizgrid fits a busy shop floor",
        body: [
          "You are cutting hair, not debugging WordPress. Describe the shop in chat, publish, and manage products between clients. Share the link on flyer QR codes, Google Business Profile, and Instagram. When someone wants product-only, they checkout without occupying a chair-side conversation.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can barbers sell products on Bizgrid?",
        answer:
          "Yes. List pomades, oils, kits, and merch as products with Paystack checkout while using Contact and WhatsApp for appointments.",
      },
      {
        question: "Do I need coding skills?",
        answer:
          "No. Bizgrid generates the site from a chat description and lets you refine it in plain language.",
      },
      ...PLATFORM_FAQS.slice(0, 2),
    ],
  },
  {
    slug: "electronics",
    name: "Electronics",
    pluralLabel: "electronics shops",
    industryKey: "electronics",
    metaTitle: "Electronics Store Website Builder | Bizgrid",
    metaDescription:
      "Build an electronics shop website with catalogs, specs, stock clarity, and Paystack checkout using Bizgrid.",
    h1: "Website Builder for Electronics Stores",
    intro:
      "Electronics buyers compare specs and sellers before they pay. Bizgrid helps you publish a trustworthy catalog — clear prices, descriptions, and secure checkout — without building a custom stack.",
    cityHook:
      "Urban electronics shoppers are skeptical of vague listings. Specs, warranty notes, and prepaid checkout reduce “is this shop serious?” friction.",
    whatToSell: [
      "Phones, accessories, and gadgets",
      "Computing and peripherals",
      "Audio and smart-home devices",
      "Bundles (device + case + protector)",
    ],
    sections: [
      {
        heading: "Catalog trust is the product",
        body: [
          "In electronics, a beautiful homepage matters less than accurate listings. Shoppers want model names, key specs, warranty expectations, and whether an item is in stock. Vague Instagram posts create high inquiry volume and low close rates.",
          "Bizgrid lets you publish a structured catalog quickly. Use rich descriptions, honest pricing, and FAQs for warranty, returns, and pickup addresses. Related products help attach high-margin accessories to core device sales.",
        ],
      },
      {
        heading: "Reduce fake demand with prepaid checkout",
        body: [
          "Cash-on-delivery culture can hurt gadget sellers through no-shows and price haggling after commitment. Paystack-powered checkout on Bizgrid lets serious buyers pay up front. Pair that with clear fulfilment messaging so customers know when they will receive the device.",
          "Abandoned-cart tools help when someone almost buys a laptop but hesitates — a follow-up with shipping reassurance often recovers the sale.",
        ],
      },
      {
        heading: "Operations for electronics retailers",
        body: [
          "Keep SKUs tight and descriptions consistent. Update stock status as units move. Use discounts for slow movers instead of confusing “DM for price” culture. Share category links into WhatsApp broadcasts so customers self-serve before you negotiate trade-ins or bulk deals personally.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I list technical specs on product pages?",
        answer:
          "Yes. Put specs in product descriptions so buyers can compare models without starting a new chat for every detail.",
      },
      {
        question: "Does Bizgrid support Paystack for gadget sales?",
        answer:
          "Yes. Checkout is built around Paystack so customers can pay with methods they already trust.",
      },
      ...PLATFORM_FAQS.slice(0, 2),
    ],
  },
  {
    slug: "bakeries",
    name: "Bakeries",
    pluralLabel: "bakeries",
    industryKey: "food_and_beverage",
    metaTitle: "Bakery Website Builder | Bizgrid",
    metaDescription:
      "Sell cakes and pastries online with a Bizgrid bakery website. Show seasonal menus, take deposits, and accept Paystack payments.",
    h1: "Website Builder for Bakeries",
    intro:
      "Birthday cakes and pastry boxes should not live only in chaotic DMs. Bizgrid helps bakeries publish menus, take prepaid orders, and set clear pickup or delivery expectations.",
    cityHook:
      "City bakery demand spikes around weekends and holidays. A live menu with cutoff times and prepaid checkout protects your production schedule.",
    whatToSell: [
      "Celebration cakes with size options",
      "Pastry boxes and breads",
      "Seasonal drops and limited flavours",
      "Corporate snack packages",
    ],
    sections: [
      {
        heading: "Turn custom-order chaos into a system",
        body: [
          "Bakeries die by last-minute WhatsApp orders with unclear flavours, sizes, and deposits. A storefront lets customers browse standard cakes and boxes, read lead-time FAQs, and pay a deposit or full amount before you buy ingredients.",
          "Bizgrid gives you that system fast: AI drafts your bakery site, you add products and flavour notes, publish FAQs for cutoff times, and share one ordering link across Instagram and WhatsApp.",
        ],
      },
      {
        heading: "Menu pages that set expectations",
        body: [
          "Show what is always available vs made-to-order. Spell out how many days you need for custom cakes. Explain allergen notes where you can. List delivery areas and pickup windows. Those details protect your bakers and delight customers who hate surprises on party day.",
          "Use product variants for sizes (6-inch, 8-inch, 10-inch) instead of renegotiating every order. Bundles work well for pastry assortments.",
        ],
      },
      {
        heading: "Grow beyond walk-ins",
        body: [
          "Walk-in traffic is great; owned online ordering is leverage. Push Friday box specials, recover abandoned cake carts before the weekend, and keep a catalog of past bestsellers for customers who reorder yearly. Your Bizgrid store becomes the memory of your bakery — not a buried chat archive.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can customers order custom cakes on Bizgrid?",
        answer:
          "Yes. List custom cake products with base prices or deposits, and use FAQs to explain flavour options, lead times, and how design requests work via WhatsApp after payment.",
      },
      {
        question: "Can I set order cutoff times?",
        answer:
          "Publish cutoff rules clearly on FAQ and product pages so customers know when overnight or same-day orders are possible. That reduces stressful last-minute requests.",
      },
      ...PLATFORM_FAQS.slice(0, 2),
    ],
  },
  {
    slug: "furniture",
    name: "Furniture",
    pluralLabel: "furniture stores",
    industryKey: "home_and_living",
    metaTitle: "Furniture Website Builder | Bizgrid",
    metaDescription:
      "Create a furniture and home store website with Bizgrid. Showcase pieces with galleries, explain delivery, and accept online payments.",
    h1: "Website Builder for Furniture Stores",
    intro:
      "Furniture is a high-trust purchase. Bizgrid helps you show pieces properly, explain delivery and assembly, and take payments — so serious buyers do not get lost in chat negotiations.",
    cityHook:
      "City furniture buyers care about delivery logistics as much as design. Clear dimensions, fees, and prepaid terms separate professional showrooms from vague social listings.",
    whatToSell: [
      "Sofas, beds, and dining sets",
      "Custom pieces with deposit pricing",
      "Home accents and lighting",
      "Office furniture packages",
    ],
    sections: [
      {
        heading: "Sell large-ticket items with clarity",
        body: [
          "People hesitate to pay for a sofa they cannot inspect dimensions for. Your website should carry multiple photos, materials, measurements, and lead times. FAQs should cover delivery floors, assembly, and what happens if a piece does not fit.",
          "Bizgrid helps furniture sellers publish that information in a storefront customers can revisit — unlike chat threads that scroll away. Paystack checkout supports deposits or full payment so production and logistics can start with commitment.",
        ],
      },
      {
        heading: "Showroom meets online catalog",
        body: [
          "If you have a physical showroom, the site extends it: customers browse before visiting, or buy remote after a video call. If you are workshop-only, the site is your showroom. Either way, related products help attach cushions, rugs, or matching side tables to the main sale.",
        ],
      },
      {
        heading: "A practical launch plan",
        body: [
          "Photograph your top 15 pieces well. Generate a Bizgrid furniture storefront. Add dimensions and delivery FAQs. Enable payments. Share category links with interior designers and WhatsApp status audiences. Improve the catalog monthly as new pieces finish.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I take deposits for custom furniture?",
        answer:
          "Yes. Price products as deposit amounts or full prices and explain the remaining balance and timeline on the product page and FAQ.",
      },
      {
        question: "How do I explain delivery?",
        answer:
          "Use FAQ and product descriptions for city delivery fees, scheduling, and assembly expectations so buyers know the full cost before checkout.",
      },
      ...PLATFORM_FAQS.slice(0, 2),
    ],
  },
  {
    slug: "grocery-stores",
    name: "Grocery Stores",
    pluralLabel: "grocery stores",
    industryKey: "food_and_beverage",
    metaTitle: "Grocery Store Website Builder | Bizgrid",
    metaDescription:
      "Launch a grocery or provision store online with Bizgrid. List staples, take prepaid neighbourhood orders, and get paid with Paystack.",
    h1: "Website Builder for Grocery Stores",
    intro:
      "Neighbourhood provision shops can take online orders without becoming a giant supermarket tech company. Bizgrid helps you list staples, take prepaid orders, and fulfil from the same shelves you already run.",
    cityHook:
      "Busy city households will reorder staples if browsing is easy and payment is prepaid. Your store link becomes the neighbourhood shortcut.",
    whatToSell: [
      "Staples and household essentials",
      "Breakfast and snack packs",
      "Weekly restock bundles",
      "Local specialties you already stock",
    ],
    sections: [
      {
        heading: "Local grocery with online convenience",
        body: [
          "Your advantage is proximity and trust — people already know your shop. What they lack is a modern ordering channel when they are stuck at work or do not want to walk over for six items. A Bizgrid storefront is that channel.",
          "List the products customers reorder most. Keep prices honest. Spell out delivery radius, fees, and packing substitutions in FAQs. Take Paystack payment so riders leave with confirmed orders, not verbal promises.",
        ],
      },
      {
        heading: "Keep operations simple",
        body: [
          "You do not need a thousand SKUs on day one. Start with top sellers and expand. Use bundles (“weekend restock pack”) to average order value up. Recover abandoned carts when someone almost completes a household order.",
          "Share the link in the community WhatsApp groups you already participate in — with better structure than posting price lists as images every morning.",
        ],
      },
      {
        heading: "Why owned checkout beats only chat lists",
        body: [
          "Chat lists go out of date. Prices change. Customers reply in half-finished sentences. A catalog with checkout keeps the offer current and the payment trail clean. That is how a small grocery expands from walk-ins to scheduled neighbourhood delivery without losing control.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can a small provision store use Bizgrid?",
        answer:
          "Yes. Start with your best-selling staples, publish delivery rules, and take prepaid orders — then grow the catalog as you learn what neighbours order online.",
      },
      {
        question: "How do substitutions work?",
        answer:
          "Explain substitution rules in your FAQ (for example, when an item is out of stock). Clear policy prevents disputes after payment.",
      },
      ...PLATFORM_FAQS.slice(0, 2),
    ],
  },
];
