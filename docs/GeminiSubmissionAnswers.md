# Bizgrid — Build with Gemini XPRIZE
## Additional info (Devpost) — full answers

Draft for judges and organizers. Most of this stays off the public project page.
Project: **Bizgrid** · Live: https://www.bizgrid.shop · Judge demo: https://www.bizgrid.shop/demo
Deadline: Monday 17 Aug 2026, 1:00 pm PT

Replace every `[FILL IN]` before submit.

---

### Upload a File

*No written answer. Optional unless they ask for a specific attachment here. Put GCP invoices, Gemini dashboards, and agent logs in the “evidence of the project running” upload later on this page.*

---

### What date did you start this project? (MM-DD-YY)

**06-17-2026**

We started Bizgrid inside the hackathon window. The first commits on the three repos land in early June 2026, and the date we put on the form is 17 June, which is when this stopped being a sketch and became “we are actually building a business.” Everything that is Bizgrid — merchant signup, the AI website builder, products, orders, the public storefront, Paystack checkout, the shopper, try-on, billing — was built after 19 May 2026. We did not drag in an old Shopify clone and slap Gemini on it in the last week.

What I will also say, because git will say it anyway: the Gemini API path and Google Cloud Storage went live in production on 15 August 2026. Before that the same agents were already running, just on OpenAI / DeepSeek. We did not backdate anything. The product existed in-window; we wired Gemini and GCS so the live app meets the Gemini API and Google Cloud rules. Judges can see that. I would rather they see an honest timeline than a story that pretends Gemini was there in June.

---

### Submitter type (individual, team, organization)

**Team**

This is a team submission under YrayPixels. We are not filing as a corporation on this form, so we are not putting an Employer Identification Number. If a judge needs a company registration later, we can provide it, but the entry type is Team.

---

### Organization name and Employer Identification Number (if applicable)

*Leave blank unless you switch the dropdown to Organization.*

---

### Country of residence of yourself and team members (if applicable)

**Nigeria**

*[Add any other country a teammate actually lives in. Do not list countries nobody on the team is in.]*

We are building this from Nigeria, for Nigerian and African small businesses first. Pricing is in Naira, checkout is Paystack, the vision agent even estimates product prices in NGN because that is the market we are standing in. That is not a branding choice, that is where the merchants are.

---

### Which Category are you submitting into?

**Small Business Services**

This is not a consumer shopping app that we happen to sell to shops. Bizgrid is a service for small businesses: they sign up, they get a store, they get AI to build and run it, their customers buy. Entrepreneurship & Job Creation is adjacent, but the person paying us is the merchant, and the job we are doing is powering their everyday operations — catalog, storefront, orders, shopper, try-on, marketing. That is Small Business Services.

---

### Explain how your project uses AI to impact the world, specifically in the category you have chosen.

The category is Small Business Services, so I am going to talk about the merchant, not about “AI changing retail” in the abstract.

Most of the people we are building for already sell. They sell on Instagram, they sell in a physical shop, they sell from a WhatsApp status. What they do not have is a real store they control — a place where a customer can browse, try, and pay without the merchant sitting on the phone answering “do you have this in black?” for the hundredth time. Shopify is a lot. A developer is a lot. A photographer plus a copywriter plus a stylist is a lot. So they stay on social, and they lose the sale the moment they miss a DM.

Bizgrid is the AI that sits in that gap.

On the merchant side, they do not open a theme customizer. They open chat and they talk like a human. “I sell handmade soy candles in Lagos, warm, gift-friendly.” The builder agents take that and generate a real storefront — homepage, about, FAQs, SEO, layout — and they can keep talking to change it. “Make it warmer.” “Change the headline.” They add products by uploading a photo. Gemini vision looks at the image and comes back with a name, a description, a category, and a sensible Naira price. That sounds small until you watch someone who has forty fabric SKUs try to type all of that by hand. Cataloguing is where small shops die. If AI does the first draft of the catalog, they actually publish.

On the customer side, the store is not just a grid. There is a personal shopper on the live catalog. You can say “I am going to a wedding next Saturday, classy but not too flashy, budget is ₦150k,” and Gemini does not invent products. It searches that merchant’s real inventory, respects the budget, and shows what they actually sell. Then we compose a look, and YouCam lets the shopper see it on themselves before they pay.

That last part is where I felt the impact in my body, not on a slide. At first I only implemented try-on for clothes, and it wowed me. I had a discussion with a merchant we were trying to onboard, and when we showed her that she was like, really? We ran a test campaign with that and it really did well. So I went through the YouCam API and looked for other tools we could use, because our project houses a lot of merchants — fabric sellers, nail technicians, handmade bags by artisans — and YouCam has a plethora of tools to accommodate that TAM. Clothes, bags, nails, fabric drape, hats, shoes. The shopper can hand you a look and then you see it on you, on that merchant’s products, not on a stock model from another planet.

We were honest with ourselves where it did not bang. When we ran the test case for the Skin API, I was not really impressed, because our use case was to advertise that to cosmetics merchants who want their customers to see the effect of a product on their skin, or do a comprehensive face analysis and recommend what would actually work. The result was not at the level I would put in front of a merchant and say this will convert. So we did not force it into the story. Clothes, bags, nails, fabric — those are live and they matter. Skin we parked until it is good enough.

The impact we are aiming at is very concrete: a one-person shop in Lagos or Onitsha or Accra can look like they have a digital team. AI builds the site. AI fills the catalog from photos. AI talks to the shopper. AI helps them see the product on their body. The merchant still owns the goods, the price, and the relationship. We are not replacing the small business. We are giving it the same weapons a funded e-commerce team already has.

If this works at scale, you do not get a prettier demo. You get more small businesses that can sell while they sleep, more artisans who are not stuck in DMs, more customers who buy with confidence instead of asking for a refund because the fabric did not look like the picture. That is the needle in Small Business Services. Not “we used an LLM.” The merchant shipped a store and a customer bought without a human in the middle.

---

### How do you measure impact?

I am not going to pretend we have a ten-year RCT. We have a theory, we have outputs we can count today, and we have outcomes we expect if the theory is right.

**The theory.** Small merchants lose sales because launching and running a proper store is too expensive in time and skill. If we collapse “describe my shop → live store → products from photos → AI shopper + try-on → checkout” into hours instead of months, they will actually go online, and some of those Instagram lurkers will become paying customers. The change we want is not “more AI in retail.” It is more small businesses with a store that works without a developer, and more of their shoppers converting because they could see themselves in the product.

**Hypotheses we are running.**

1. Chat-to-store beats a blank dashboard. If a merchant can talk their shop into existence, they will finish onboarding instead of abandoning it.
2. Photo-to-product (Gemini vision) is the difference between a catalog of five items and a catalog of fifty. Merchants will list more if they do not have to write every SKU.
3. An on-site Gemini shopper that only recommends real in-stock products will create add-to-carts that a static grid would miss, especially for “I have an occasion and a budget” shoppers.
4. Virtual try-on, for the verticals where YouCam is strong (apparel, bags, nails, fabric), will increase confidence and reduce “it didn’t look like that” friction. We already saw this in a test campaign with clothes — the merchant reaction was not polite interest, it was “really?” and then the campaign did well.
5. Skin/cosmetics analysis is a real TAM, but the current Skin API quality is not good enough for us to claim impact there yet. We measure that by not shipping a weak feature and pretending.

**Outputs we measure now** (the things in the product, not vibes):

- Merchants who sign up and complete onboarding
- Storefronts that actually get published (draft is not impact)
- Builder sessions and successful generate/refine runs
- Products created, and of those, how many started from a vision pass on a photo
- Gemini shopper turns on live catalogs (tool calls to `search_catalog` / `show_products`, not a chatbot that hallucinates SKUs)
- Try-on sessions by type (apparel, bag, nail, fabric)
- Orders placed on hosted storefronts, GMV through Paystack
- Trial → paid plan conversions (Starter / Growth / Scale)
- AI credit usage vs cap, because that tells us whether the agents are being used or just sitting there

**Outcomes we expect.**

Short term (this hackathon window and the months after): time-to-first-published-store in minutes, not weeks. Catalogs that exist because someone photographed a table of products. Shopper-assisted sessions that end in a cart. At least some merchants who came in through a demo or a conversation and stayed because try-on or the builder made the store feel real.

Long term: paid subscriptions covering infra, a 2.5% take on online orders as GMV grows, merchants who would have stayed on Instagram now running a Bizgrid store as their actual shop. Category impact is “this is how a small Nigerian retailer goes online,” not “we got a lot of waitlist emails.”

**How we prove we are catalysts.** If merchants publish without us sitting next to them, that is the product. If shoppers on a live store use Gemini and YouCam and then pay Paystack, that is the loop. If they convert from the 14-day trial to NGN 5,000 / 15,000 / 30,000 a month, that is the business. We will not count our own test stores as impact. Related-party activity gets reported separately. Success is arms-length merchants and arms-length shoppers doing those things without us in the chat.

---

### Explain the underlying business model of your submission.

We sell to businesses. B2B. The shopper on the storefront is the merchant’s customer, not ours. We do not take a cut of their Instagram fame. We give the merchant a store and we charge the merchant.

**How we acquire.** Self-serve at bizgrid.shop. Sign up, verify email, land on a 14-day Starter trial with no card. We also onboard people the unscalable way, which is how you actually learn: sit with a fabric seller, a nail tech, a bag artisan, show them the store and the try-on, and watch where they get stuck. That conversation with the merchant who said “really?” when she saw clothes try-on is acquisition research, not a growth hack. When something lands, we run a small campaign around that feature, like we did with apparel try-on, and we see if strangers behave like the person in the room.

**How we create value.** Three layers.

1. They get a hosted storefront on a Bizgrid subdomain, later a custom domain on Growth/Scale. Products, categories, orders, Paystack checkout. This is the unsexy part and it has to work or nothing else matters.
2. They get AI as staff they cannot afford: builder chat to generate and edit the site, Gemini vision to turn a product photo into a listing, a marketing agent for copy, a Gemini shopper on the store that knows the catalog.
3. They get try-on through YouCam for the verticals we actually serve — clothes, bags, nails, fabric — so their customer can see it before they buy. That is a feature of their store, not a separate app.

**How we retain.** Once the live shop, the catalog, and the order history are on Bizgrid, leaving means rebuilding. Daily AI caps and SMS/WhatsApp units create a reason to stay on a plan and to buy packs when they outgrow the included amount. The shopper and try-on only work on their catalog, so the more they list, the more the AI is worth, and the more painful it is to go back to DMs.

**How we earn money.**

- Subscriptions via Dodo: Starter NGN 5,000 / month, Growth NGN 15,000, Scale NGN 30,000. Starter is one storefront. Growth is up to three stores and a custom domain. Scale is up to ten stores and five custom domains. All of them include a 14-day trial, unlimited customers, and a daily AI allowance (5 queries/day in the current plans) plus SMS and WhatsApp units.
- 2.5% platform fee on every online order. Offline / POS is not fee-charged. That 2.5% is ours; Paystack’s own fees are separate. GMV is the merchant’s. We only count the fee and the subscription as our revenue.
- Add-on packs: extra SMS, WhatsApp, and AI credits when they burn the included amount.

We are not a marketplace. We are not taking 20% because we introduced the buyer. We are Shopify-shaped, AI-native, priced for the Nigerian small shop, with try-on as the wedge that makes the store feel unfairly good compared to an Instagram grid.

---

### How will you sustain business operations in the future?

I will be practical, because “we will raise a seed round” is not a plan.

**What we spend money on to keep the lights on.** The Next.js merchant app and storefronts, the Laravel API, MySQL, queue workers, Google Cloud Storage for every product photo and try-on image, Gemini (AI Studio or Vertex) for shopper / vision / marketing, OpenAI for the builder, YouCam / PerfectCorp for try-on, Paystack and Dodo for money movement, and the domain/hosting we already run on. Team time is the real scarce resource. We are not a 40-person company. We allocate people to: keep production up, make the agents cheaper and more reliable, and sit with merchants until the onboarding path does not need us in the room.

**Threats I actually worry about.**

- LLM cost. If every trial merchant burns Gemini shopper turns and vision jobs and never converts, we are paying Google and OpenAI to demo. That is why plans have a daily AI cap and why we sell AI credit packs. After the hackathon we will keep tightening routing — Gemini where it has to be Gemini, smaller models where it is a rewrite.
- YouCam cost and quality by vertical. Apparel and bags earned their place. Skin did not. We will not subsidize a feature that does not convert just because the API exists.
- Payment and FX. We price in Naira and we have to report this hackathon in USD. Provider outages, card failure, Dodo vs Paystack operational mess — that can stall revenue even if the product is fine.
- Concentration. If our “users” are mostly people we know, we do not have a business. We already know we have to report related-party revenue separately, and we should treat that as a warning light, not a rounding error.
- Single-threaded team. If production Gemini or GCS breaks, it is us who wake up. There is no follow-the-sun ops team.

**What changes after the hackathon.** The product does not get thrown away. Bizgrid stays the company. We keep GCS as the media layer. We keep Gemini on shopper, vision, and marketing because that is the live path. Builder stays on OpenAI until we have a reason to move it. We will put more energy into converting the 14-day trial, into the verticals where try-on already wowed merchants, and into making photo-to-catalog so fast that a fabric seller with a table of Ankara does not give up. Resource allocation after 17 August is: reliability and conversion first, new YouCam toys second, and only the ones that survive a merchant sitting next to us.

We sustain this by charging for it, capping AI so trial abuse cannot kill us, and only expanding into new merchant types when the try-on and the shopper actually work for them. That is slower than a pitch deck. It is how a small team stays alive.

---

### Which AI tools have you leveraged while working on this project?

I am going to separate “AI that runs the business” from “AI that helped us build the business,” because both are true and judges always ask.

**In production, for merchants and shoppers:**

- **Gemini 3.6 Flash** via the Gemini API (Google AI Studio key, OpenAI-compatible endpoint) and optionally **Vertex AI** on the same Google Cloud project as our storage. This is the shopper on the storefront, the vision pass on product photos, and the marketing agent. When a customer says they need a wedding look under ₦150k, Gemini is the model that decides to call `search_catalog`, reads what came back, and picks what to show. When a merchant uploads a picture of a bag, Gemini is what writes the name, the description, the category, and a Naira price. That is not a prototype. That is the default routing in `config/ai.php` — shopper, marketing, vision all default to Gemini.
- **OpenAI** (GPT-4o / 4o-mini class) for the website builder. The merchant chats, the builder agents plan, generate the storefront, edit blocks. We kept builder on OpenAI on purpose. It was already good at the generate-and-refine loop, and we did not rip it out the week of the deadline to make everything Gemini. The rule is at least one live Gemini call. We did more than one surface, but we did not do a fake rewrite of the whole stack.
- **DeepSeek** as a builder/provider option if we need it. Not the hero path.
- **YouCam / PerfectCorp.** This is not an LLM, but it is AI, and it is how try-on works — apparel, bags, nails, fabric, and we tested skin. I started with clothes try-on, it wowed me, a merchant said “really?”, we ran a campaign, it did well, then I went through their API and mapped it to our TAM. Skin did not impress me for cosmetics recommendation, so I am not going to list it like it is a pillar.

**Infrastructure that is AI-adjacent:**

- **Google Cloud Storage** for the images Gemini and YouCam actually see. Product photos, try-on selfies, result looks. If the image is not reachable, vision and try-on die. GCS is how we stopped treating the local disk like a CDN.
- **Google AI Studio / Vertex AI** for keys, billing, and the dashboards we are supposed to screenshot for this form.

**While building:**

- Cursor and other coding assistants, every day. The agents, the builder, the GCS client, the Gemini routing — we did not hand-write every line in a vacuum. I am not going to be precious about that. The product decisions, the merchant conversations, the “skin API is not good enough” call, those are ours.

If you want the short list for the form: Gemini 3.6 Flash, Vertex AI (optional auth), OpenAI for the builder, YouCam/PerfectCorp for try-on, Google Cloud Storage, Google AI Studio, Cursor.

---

### Explain how your business model shared above is sustainable and viable.

I will take their five points in order, in the way I actually think about this, not in consultant-speak.

**1. Five-year goal.** I want Bizgrid to be the default way a small retailer in Nigeria — and then similar markets — gets a real store without hiring a digital team. Target is not “we are Amazon.” Target is: tens of thousands of merchants, a chunk of independent fashion, beauty-adjacent, fabric, and artisan retail that is currently stuck on Instagram. TAM for us is every small shop that has products and a phone and no developer. In Nigeria alone that is a very large number of people. Market share in five years that would make me feel we were right: being the obvious name when a fabric seller or a nail tech asks “how do I sell online with try-on.” Revenue mix I want is subscriptions as the base, 2.5% of GMV as the upside when they actually sell, and AI/SMS packs as the usage layer. I am not going to put a fantasy ARR number here that I cannot defend. The shape is: NGN 5k–30k per merchant per month, plus take-rate, times a merchant base that we earn in the unglamorous way.

**2. Path to profitability.** Our COGS per extra merchant is shared app, shared DB, GCS storage, and metered LLM/try-on. That is the whole point of software. The dangerous COGS is Gemini + YouCam on unpaid usage. So the path is: 14-day trial with a daily AI cap, then Starter at NGN 5,000 if they only need one store, Growth/Scale when they have more storefronts or a custom domain, 2.5% on every online order so we participate when they win, and packs when they outgrow the included SMS/WhatsApp/AI. Profitability is the month when paid merchants plus take-rate cover hosting, GCS, Gemini, OpenAI, YouCam, and the team. I will fill the P&L with real numbers for this window. If this window is still mostly trial and build, I will say that. A P&L that looks like a seed-stage SaaS in month three is not a scandal. A P&L that hides related-party money is.

**3. Why it is achievable, and what we saw in the hackathon.** The product is live at bizgrid.shop. A judge can open `/demo`, get into a seeded merchant, and see a published store, products, orders, builder, shopper. That is more than a Figma. We sat with real merchant types — clothes, fabrics, nails, handmade bags — and the thing that moved people was not our pricing page, it was try-on and the idea that the store could talk to a shopper. We ran a test campaign on clothes try-on and it did well. That is the hypothesis working in miniature. Traction numbers for users, paying users, and USD revenue go in the fields below as they actually are, including zero if that is the truth.

**4. Evidence of product-market fit.** Fit, for me, is a merchant who was not going to build a Shopify store, seeing try-on or photo-to-product, and leaning in. The “really?” in that onboarding conversation is the loudest signal we have. Secondary signals: they publish, they add more than three products, shoppers use the Gemini agent on their catalog, try-on sessions happen, an order comes in through Paystack. We are early. I will not dress up early as “we have crushed PMF.” I will say the wedge is real — especially apparel try-on plus AI storefront for people who sell with their hands — and the rest is whether we can convert that moment into a paid plan without us in the room.

**5. Preserving resources.** Daily AI limits. GCS instead of stuffing images on the API box. Gemini Flash rather than pointing every call at a giant model. Builder left on OpenAI because it already worked. Skin API not productized because it would burn YouCam budget and embarrass us in front of a cosmetics merchant. After the hackathon, same discipline: do not open new verticals until the ones that already bang can pay for the ones that do not.

That is the viability story. A priced SaaS, a take-rate, metered AI, a live product, and a wedge we have already watched a merchant react to. The rest is whether we execute without lying on this form.

---

### Please explain how your business operates with AI.

If you stripped the AI out of Bizgrid you would not get a slightly worse Shopify. You would get a dashboard that a small merchant will not finish, a catalog they will not type, and a storefront that cannot answer “what should I wear to this wedding.” The business operates with AI in the same way a small shop operates with a good attendant. The attendant is not a widget. The attendant is how work gets done.

**Merchant operations.** A new merchant does not fill a 40-field setup wizard. They talk. Builder agents interpret what they said, pick a direction, generate the store, and keep going when they say “build my website” or “change the headline.” That is how we acquire a usable store, which is how we acquire a customer of our own. Then they upload product photos. Vision — Gemini — looks at the image and writes the listing. That is how cataloguing happens at the speed of a phone camera instead of a bored afternoon of data entry. Marketing copy for channels is another agent. None of that is a human ops team we hired. We do not have that team. The agents are the team.

**Customer operations, on the merchant’s store.** The Gemini shopper is live on the storefront. It is not a site-wide ChatGPT with a system prompt that says “be helpful.” It has tools. It searches the live catalog. It only shows products that came back from that search. It can build a look. It can send the shopper into YouCam try-on for clothes, bags, nails, fabric — the verticals we actually stand behind. So the “staff” that greets a shopper at 11pm is Gemini plus the catalog plus YouCam. The merchant is asleep. That is the operating model.

**Decisions AI makes that a human used to make.**

- What the website should say and how it should look, from a messy paragraph about the business
- What a product is called, how it is described, what it might cost in NGN, what category it belongs in, from a photo
- Which products in this specific store match this shopper’s occasion, style, and budget
- Whether to show one item or compose a look
- Whether try-on is the next step (and which YouCam tool: apparel vs bag vs nail vs fabric)

**Decisions AI does not make, on purpose.** It does not invent SKUs. It does not set the merchant’s payout. It does not move money — Paystack and Dodo do. It does not tell a cosmetics shop their Skin API analysis is medical-grade, because I used it and I was not impressed. Drawing that line is also how we operate with AI: use it where it is strong, refuse it where it would hurt the merchant.

**What we can do with AI that meaningfully moves Small Business Services.** A fabric seller can show drape instead of arguing in DMs. A nail technician can let someone see a design on their own hands. An artisan who makes bags can put the bag on the customer’s shoulder in a photo. A clothes merchant can run a campaign around try-on and actually get the “really?” reaction we already saw. And all of them can have a store that was generated in chat instead of abandoned in a theme editor. That is the needle. Not that we used Gemini. That a small business can compete on experience with brands that have agencies.

YouCam is a beautiful product with a lot of tools that really bang, and Gemini is the brain that decides when to use them and what from the catalog to put in front of you. Google Cloud Storage is the closet where all the photos live so both of those AIs can see them. Together that is the company, not a feature list.

---

### Please explain the extent to which AI is live in production and executes key decisions.

This is in production. Not a notebook. Not a slide.

**Live paths, today.**

- **Website builder (OpenAI).** Merchant chat on bizgrid.shop. Agents plan, call tools, generate and edit the storefront. That path executes the decision “what should this shop look like and say.” It has been live since we had merchants to onboard, on OpenAI, and we left it there.
- **Personal shopper (Gemini).** On the public storefront. Default provider for shopper agents is Gemini. A turn goes to Gemini 3.6 Flash with tools. Gemini decides to search, how to search, and which returned products to put on the card. That is a key decision: what the customer sees as “for you.” If Gemini is down, that attendant is down. We log agent executions so we can prove this — and the logs have to show `provider=gemini` and success, not a pile of 403s from a bad key. We learned that the hard way with Cloud Console keys and retired model names. Production means a key that actually works, Flash 3.6, and a shopper turn on a live catalog.
- **Vision (Gemini).** Product photo in, JSON out: name, price, description, category. That executes the decision “what is this SKU.” It is how a merchant can list without writing. Live when the vision provider is Gemini, which is the default.
- **Marketing agent (Gemini).** Copy decisions for merchant marketing surfaces.
- **Try-on (YouCam), orchestrated from the store and the shopper.** Not an LLM, but it is live AI executing “what would this look like on you.” Apparel, bag, nail, fabric. Skin we tested and did not trust enough to sell.

**What is not AI.** Checkout, subscriptions, order status, inventory decrement. Those are boring on purpose. I do not want Gemini charging a card.

**How much of the company depends on this.** Acquisition of the merchant’s storefront depends on the builder. Acquisition of catalog depth depends on vision. Conversion on the storefront depends on the shopper and try-on. Revenue depends on merchants who got those things and then either paid a plan or sold through Paystack so we take 2.5%. So AI is not a copilot sitting next to a human ops team. There is no ops team doing listings and styling at 11pm. The agents are in the loop or the loop does not run.

**Honesty about when Gemini itself went live.** Shopper / vision / marketing were already agents before 15 August. They ran on other providers. On 15 August we put Gemini on those paths and GCS under the media, and we shipped that to production. So if you ask “does Gemini execute key decisions in the deployed app?” the answer is yes: shopper, vision, marketing. If you ask “did Gemini execute them in June?” the answer is no, and I will not write that it did. What matters for this prize is that the business runs on AI, and that the deployed app makes real Gemini calls. Both are true. The date Gemini entered the stack is 15 August 2026.

---

### Please explain which product from Google Cloud you used during the hackathon and how.

**Google Cloud Storage.** That is the Cloud product. Not Maps, not OAuth, not “we have a Gmail.”

Every product image, every try-on selfie, every YouCam result look has to live somewhere a browser and an API can fetch forever. We were on local/public disk like every early app, and that falls apart the moment the API box restarts or YouCam tries to pull a file it cannot see. So we put a bucket in front of the platform. Merchants upload, the backend writes to GCS with a service account, objects sit at `storage.googleapis.com`, and we can grant public read on the storefront prefix so the shop and try-on do not break. If the bucket is private, the same service account fetches the bytes so PerfectCorp still gets a file. There is a health probe that writes a tiny object and reads it back. If that fails, we know media is dead before a merchant does.

That bucket is also how Gemini vision works in production. Vision has to see the photo. Try-on has to see the photo. The shopper card has to show the photo. GCS is the spine under all of that.

**Vertex AI** is the other Cloud piece, as an auth mode for Gemini. We can bill Gemini through the same Google Cloud project and service account instead of only a prepaid AI Studio key. When Studio credits die, Vertex is how we keep shopper/vision/marketing alive on Cloud billing. The form asked which Cloud product we used — Storage is the one that is unambiguously in the runtime for every merchant photo. Vertex is how Gemini can ride the same project.

We also use Google sign-in and we have Places autocomplete in the product. I am not using those to satisfy the “must use a Google Cloud product” rule. Judges have already said that kind of thing does not count. GCS is what counts, and it is doing real work.

---

### If your project uses an LLM, it must use Gemini API for at least one LLM call. Please explain which LLMs are used in the project and specifically how the Gemini API is used.

We use more than one LLM. The rules allow that. We still put Gemini on live paths, not on a hidden “hello world” script.

**LLMs in the project.**

1. **Gemini 3.6 Flash** — default for shopper, vision, and marketing. Also available: 3.1 Pro preview if we need heavier reasoning, 3.1 Flash-Lite if we need cheaper. Production default is 3.6 Flash.
2. **OpenAI** — website builder chat, storefront generation and edits. Models in the vein of GPT-4o and 4o-mini, configurable in platform admin.
3. **DeepSeek** — optional builder/provider (v4 Pro, chat, reasoner, etc.). Fallback, not the face of the product.

**How the Gemini API is used, specifically.**

The backend talks to Gemini through our `AiChatClient`, same shape as OpenAI, using either:

- **Gemini API** at `https://generativelanguage.googleapis.com/v1beta/openai` with an AI Studio API key, or
- **Vertex AI** with the GCS service account, when `GEMINI_AUTH=vertex`.

Feature routing is explicit: `AI_SHOPPER_PROVIDER`, `AI_MARKETING_PROVIDER`, `AI_VISION_PROVIDER` default to `gemini`. Platform admin can change that, but the intended production setup is Gemini on those three.

**Call sites that are real product, not probes:**

- **Shopping shopper agent** (and the related intent / planner / product-picker agents). A shopper on a live storefront sends a message. We load the merchant’s catalog context. Gemini gets a system prompt and tools: `search_catalog`, `show_products`, and the rest of the shopping tools. Gemini chooses to search “emerald dress wedding ₦150k,” we run that against MySQL for that store only, we return real rows, Gemini chooses which IDs to show. That is at least one LLM call per turn, in the deployed app, on Gemini, producing a customer-facing decision.
- **VisionAgent.** Merchant (or import flow) supplies an image URL. We pull the image (including from GCS), send it to Gemini vision, and require JSON: name, price in NGN, description, category. That write-up becomes the product listing draft. That is Gemini looking at pixels and executing a catalog decision.
- **Marketing agent.** Gemini drafts copy. Merchant-facing, production.

We also have a “Test Gemini key” probe in admin so we can see 200 vs 403 before a shopper hits it. That probe is not the required call. The required call is the shopper (and vision) on production. We will attach logs that show `provider=gemini`, model `gemini-3.6-flash`, HTTP 200, not the 403s we hit when we tried a restricted Cloud Console key or a retired 2.5 Flash id.

Builder stays OpenAI. I am saying that twice on purpose. We did not launder the whole company through one Gemini request. We put Gemini where the customer and the catalog are.

---

### URL to your GitHub repo code repository shared with testing@devpost.com and judging@hacker.fund

**Primary (put this in the URL field):**  
https://github.com/YrayPixels/bizgrid-backend

**The other two repos, also share with those emails:**  
https://github.com/YrayPixels/bigrid-frontend  
https://github.com/YrayPixels/storehouseadmin

Backend is the one with Gemini, Vertex, GCS, agents, billing, try-on. Frontend is the merchant app and storefronts (Next.js). Admin is platform ops — merchants, AI settings, agent logs. All three are required to understand the system. README in each repo points at the others.

Before we tick the confirmation box: add `testing@devpost.com` and `judging@hacker.fund` as collaborators on all three if they are private, or make them public with a license. Public plus a license is cleaner. Do not submit a URL the judges cannot clone.

---

### Upload evidence of the project running.

*Files, not a paragraph. Allowed: pdf, png, jpg, jpeg. Max 35MB each.*

Pack at least:

1. **GCP billing invoices** for every month we had a Cloud project in this competition (May–August 2026 as applicable). Console → Billing → Invoice. If it is Free Tier or credits, export the zero-dollar invoice or cost table anyway. They asked for monthly PDFs. Empty months still get a file.
2. **Screenshots of Gemini observability** — AI Studio and/or Vertex dashboards showing Gemini 3.6 Flash traffic, not a blank project.
3. **Agent execution logs** from our admin: shopper turns with `provider=gemini`, success, timestamps. A 403 screenshot is not evidence the project runs. A 200 is.
4. **GCS evidence:** upload a product image, show the `storage.googleapis.com` URL in the browser, plus the admin storage health probe if we have a screenshot.
5. **Product running:** bizgrid.shop, a published storefront, builder chat, shopper, try-on result, Paystack or demo checkout. `/demo` exists for judges (Glow Rituals seeded merchant).
6. Anything else that shows this is continuous production — not a laptop demo from the night before.

---

### I confirm that my GitHub repo linked above is shared with testing@devpost.com and judging@hacker.fund

**Check this only after it is actually shared.** Checking it while the repos are private and unshared is how you fail a paperwork round.

---

### Are you using any pre-existing business resources (anything that existed before May 19, 2026) for this Project? If yes: list each pre-existing resource and explain how it’s being applied to the Project.

Yes. I would rather list this than get caught.

**YrayPixels as a team / existing practice.** We existed before 19 May 2026. We had a way of working, GitHub, domains, hosting habits, and the ability to stand up Laravel and Next.js without learning programming during the hackathon. That is a pre-existing resource. We used it the way every team uses prior skill: to actually ship. The Bizgrid product in these three repos is still new work from June 2026 onward.

**Prior products and code gravity.** The backend and admin had hosted other experiments before StoreHause/Bizgrid was the only thing left. Those other products are not what we are submitting. We stripped the platform down to this merchant store. I am disclosing that we are not a team that appeared on 19 May with zero history. We are a team that chose this problem inside the window and built this codebase inside the window.

**Existing relationships.** Any merchant we already knew, any audience on social, any previous customer we asked to look at try-on — that is a pre-existing resource if the relationship existed before 19 May. We used those relationships to get in the room, to show clothes try-on, to hear “really?”, to run a test campaign. That is allowed if we say it. What is not allowed is counting those people as if they were cold acquisition without saying so. Related-party revenue has its own field below. Same energy here: if we emailed people we already had, we list it.

**Tools and accounts.** Google Cloud, AI Studio, YouCam/PerfectCorp, Paystack, Dodo, GitHub, Cursor — vendor accounts. Some of those orgs existed before the hackathon. The Bizgrid wiring — GCS bucket for store media, Gemini on shopper/vision/marketing, Dodo plans at NGN 5k/15k/30k, Paystack on the storefront — is hackathon work.

**What did not exist before the window.** This merchant platform as a business: chat-to-store, hosted storefronts, Gemini shopper, vision listings, YouCam in the shopping flow, the billing plans, the live site at bizgrid.shop. First commits in these repos are June 2026. Gemini and GCS production wiring is 15 August 2026.

If a judge asks “did you use pre-existing resources?” the honest sentence is: we used our existing team, skills, and some relationships to build a new small-business product during the hackathon. We did not submit an old app with a new landing page.

---

### Total Revenue. Total revenue earned during the Hackathon period, in USD (even if $0).

**[FILL IN USD, even if 0]**

This is Bizgrid’s revenue, not merchant GMV. Subscriptions + 2.5% platform fees + add-on packs, converted to USD. If nobody has paid us yet, it is $0. Do not put Paystack checkout volume through merchants’ stores in this box.

---

### Revenue by Month. Revenue broken out by calendar month, in USD (even if $0): May, June, July, and August 2026.

**May: $[FILL IN], June: $[FILL IN], July: $[FILL IN], August: $[FILL IN]**

May should almost certainly be $0 if we started in June. Do not smear later revenue into May to look smoother.

---

### Explain the revenue shared above.

I will explain it the way we actually make money, then you drop the real numbers in.

Bizgrid does not earn when a shopper buys a dress, except for a 2.5% platform fee on that online order. The dress money is the merchant’s. Our revenue is:

1. **Subscriptions.** Starter NGN 5,000 per month, Growth NGN 15,000, Scale NGN 30,000, billed through Dodo. Period is monthly. A merchant on a 14-day trial is not revenue until they convert (or until Dodo actually charges, depending on how the trial is configured — we own a no-card trial from signup, and we tried not to stack a second trial on the Dodo product). Price per customer is those Naira amounts, converted to USD at **[FILL IN FX rate and date, e.g. official or your bank rate on the day you compile the P&L]**. Number of paying merchants in the window: **[FILL IN]**. Number of subscription charges: **[FILL IN]**.

2. **Take-rate.** 2.5% of online GMV on hosted checkout (Paystack). Offline/POS not included. If we had NGN **[FILL IN]** of eligible online GMV, 2.5% of that is ours. Shopper GMV is not “our total revenue.”

3. **Packs.** SMS, WhatsApp, AI credit packs. One-time (or as purchased), not a second subscription. **[FILL IN count and USD].**

If the total is $0, the explanation is still this model. We built the cash register. The fact that the hackathon window is short and a lot of people are on trial does not mean we do not know how we earn. It means the P&L for 90 days looks like a company that just stood up billing.

I will also say what we will not do: we will not convert a friend’s “I will pay you later” into revenue. We will not count our own test orders. We will not count a merchant’s Paystack settlement as if it landed in our account.

---

### Related-Party Revenue. Any revenue earned during the Hackathon period from team members, family, related entities, or pre-existing customer relationships, in USD (even if $0).

**[FILL IN USD, even if 0]**

If I paid Starter on my own store, that is related-party. If a cousin paid, related-party. If a merchant we already knew from before 19 May paid, related-party. Put it here even if it is the only money we made. Judges are trying to see whether anyone who does not love us will pay. Hiding that is worse than a small number.

---

### Total Expenses. Total costs incurred during the Hackathon period, in USD (even if $0).

**[FILL IN USD, even if 0]**

Then the next box is the breakdown. Add everything we actually spent to build and run this: hosting, domains, Google Cloud, Gemini/AI Studio, OpenAI, YouCam, Paystack/Dodo fees we ate, design, ads if any, contractor/team if we are counting cash, devices, whatever left the account. If we did not pay ourselves a salary, do not invent one. If we did, put it in G&A or R&D honestly.

---

### Explain the expenses above.

I will structure this the way they asked, and you fill the percents from the real total.

**[FILL IN the five percents so they add to ~100%.]**

**(1) COGS — [FILL IN]%**  
Cost of actually serving stores: hosting for the API and the Next.js app, MySQL, GCS storage and egress, Gemini inference for shopper/vision/marketing, OpenAI for builder, YouCam try-on API usage, transactional SMS/WhatsApp if we paid a provider, payment processing fees on our own checkout. Driver: every published store and every AI/try-on call. This should move with usage, not with how many slides we made.

**(2) Sales and marketing — [FILL IN]%**  
Ads, boosts, the test campaign we ran around clothes try-on, landing page experiments, anything we paid to get a merchant in the door. Driver: acquisition experiments. If we did not spend, this is 0% and I will say we acquired by sitting with merchants and showing them the product. Unpaid time is not a marketing expense unless we put a cash salary in the P&L.

**(3) Research and development — [FILL IN]%**  
Building the thing: engineering time if we paid it, extra model spend that was us testing Gemini keys, Vertex, retired models, Skin API experiments that we did not ship, Cursor if we paid, YouCam playground usage while I was going through their API looking for tools for fabrics, nails, bags. Driver: we were in a hackathon, so a lot of the burn is R&D. That is allowed. Call it what it is.

**(4) General and administrative — [FILL IN]%**  
Domains, Google Workspace or email, bank/FX, incorporation if any, accounting, the boring stuff. Driver: existing YrayPixels overhead that we used to run this project, if we are allocating it. If we are not allocating old overhead, say so and keep G&A small.

**Drivers, in sentences.** The big swinging costs I expect are models and try-on, then hosting/GCS. Marketing is either a small campaign or zero. R&D is high because we built a whole merchant platform in one summer and then spent a weekend putting Gemini and GCS into production the right way. I would rather a judge see “mostly R&D + infra” than a made-up CAC story.

---

### Total Cost of Goods Sold (COGS) during the Hackathon period, in USD (even if $0).

**[FILL IN USD]**

Same definition as above: production of the service we sell — hosting, GCS, LLMs, YouCam, communications, payment fees tied to serving merchants. Not ads. Not our laptops unless you are capitalizing hardware, which we should not.

---

### Please explain the expenses associated with your COGS above.

COGS for us is not fabric and thread. We do not manufacture bags. We manufacture a hosted, AI-operated store.

When a merchant publishes, we pay to keep their storefront up (compute + DB). When they upload a photo, we pay GCS. When Gemini writes the listing or talks to a shopper, we pay Google. When the builder generates the site, we pay OpenAI. When a customer tries on a dress or a bag or a nail set, we pay YouCam. When we send an SMS or WhatsApp from the included units, we pay that provider. When an order runs through Paystack, there are processing costs; our 2.5% is revenue, their fee is not something to confuse with GMV.

The COGS line on the P&L is the sum of those production costs in the window, in USD. If Gemini was only healthy for the last days of the window, the Gemini slice of COGS might be small compared to OpenAI and YouCam from the months before. That is consistent with the timeline. I will not pretend Gemini inference was a summer-long COGS line if the bills say otherwise.

What I will not dump into COGS: my time learning the Skin API, Cursor, or a failed experiment — that is R&D. A boosted post is marketing. The Cloud invoice might mix GCS and Vertex; we should split Storage vs AI as best as the invoice allows so COGS is not a blob.

---

### Total marketing and customer acquisition expense, in USD (even if $0).

**[FILL IN USD, even if 0]**

---

### Please explain the marketing and customer acquisition expenses you incurred during the hackathon period, if any.

I will describe how we actually acquired, then you attach the receipt total.

**Marketing (paid attention).** We ran a test campaign around clothes try-on after a merchant sat with us and said “really?” That campaign did well, which is why I went deeper into YouCam for bags, nails, fabric. If that campaign cost money — boost, ads, creative, landing — it goes here. **[FILL IN what we spent and on which channel.]** If it was just us posting from accounts we already had, the cash might be $0 and the pre-existing audience belongs in the pre-existing resources answer, not in this expense line.

**Sales (human acquisition).** Sitting with fabric sellers, nail technicians, bag artisans, walking them through the store, the shopper, try-on. That is sales. If we did not pay a salesperson a salary, the cash expense is $0. I am not going to invent a fully loaded CAC from our own nights. If we paid anyone to onboard merchants, that is sales and it belongs here.

**What we did not do.** We did not buy a huge ads campaign we cannot show invoices for. We did not pay influencers in secret. If marketing is $0, the sentence is: we acquired by product demonstration and direct conversations, and the only paid experiment was **[FILL IN or “none”]**.

Judges asked to split marketing vs sales. Paid media = marketing. Paid people talking to merchants = sales. Everything else is sweat and should not be laundered into this box.

---

### Additional Expenses. Please share any missing expenses not covered in the previous expense questions.

**[FILL IN one sentence, or “None. All costs are in COGS, sales and marketing, R&D, or G&A above.”]**

Examples if they exist: YouCam plan minimums, a domain renewal, a contractor who did the demo video, PerfectCorp overage, a one-off Cloud support thing. One sentence each, USD amount.

---

### Number of users acquired during the hackathon (even if 0).

**[FILL IN]**

Define it on the form in one clause so nobody thinks we counted pageviews: **merchants who created an account on Bizgrid during 19 May–17 Aug 2026.** If we also want to mention storefront shoppers, that is a second number, labeled separately, not stuffed into this box. Do not count the team. Do not count `/demo` logins as acquired users.

---

### Number of those users paying for your services or product during the hackathon (even if 0).

**[FILL IN]**

Paying = Dodo charged them for Starter/Growth/Scale or a pack, or we otherwise received subscription/pack revenue from that merchant. Trial-only is not paying. Related-party paying users still count here as paying, but their dollars go in related-party revenue. Be consistent.

---

### Share a verifiable testimonial by a customer or user that is available publicly via a post online.

**[FILL IN public URL]**

Needs to be a real public post — tweet, Instagram, LinkedIn, a public Google review, a public comment — from someone who used the product and knows we are putting this on a prize submission. The clothes-try-on merchant who said “really?” is a story for the long answers. It is not a testimonial until she (or he) posts it where a judge can click. Do not screenshot a private WhatsApp and call it public.

---

### Describe the level of learning you/your team derived from the project

*There is a dropdown on Devpost — pick the highest option that is true. If there is also a text box, paste this.*

We learned a lot, and not the motivational-poster kind.

We learned that small merchants do not care about our architecture. They care about the moment the dress is on their customer’s body in a photo. I only implemented clothes try-on at first, it wowed me, we showed a merchant, she said “really?”, we ran a campaign, it did well. That taught me more than any TAM slide. Then I went through YouCam’s API like a catalogue: bags, nails, fabric, hats, shoes, skin. Our TAM is messy on purpose — fabric sellers, nail technicians, handmade bags — and the learning was that one try-on API family can cover a lot of that, but not all of it equally. Skin, for cosmetics and “this will work on your face,” did not impress me. Shipping it would have been a lie. So we learned to productize the tools that bang and to leave the ones that do not.

We learned that AI that writes a store is different from AI that sells. The builder (OpenAI) is how the merchant gets a shop. Gemini on the shopper is how the shopper gets a decision from a real catalog. Vision is how the catalog gets thick enough that the shopper has something to say. If you only do the builder, you have a pretty empty shop. If you only do the shopper, you have a brain with no store. The business is the three of them plus checkout.

We learned production Gemini is not “paste a Google key.” Restricted Cloud Console keys 403. Retired models 404. Prepaid Studio credits die. Vertex and a clean AI Studio key are the grown-up path. GCS is not optional once YouCam and vision have to fetch images. We learned that in production, with logs, not in a blog post.

We learned our billing model in public: Naira prices, 14-day trial, 2.5% on online orders, daily AI caps. We learned we have to separate GMV from revenue or we will fool ourselves.

And we learned the hackathon version of humility. The company was built in-window. Gemini and GCS were wired at the end so the live app meets the rules. That is still learning: what the stack actually has to be, not what we sketched in June. I am more sure now that Small Business Services is the right category, that try-on plus chat-to-store is the wedge, and that cosmetics-skin is not, than I was on day one.

---

### Upload your Profit evidence (P&L)

*File upload. Template: https://bit.ly/4w3DvwL*

Fill it with the same numbers as the fields above. Months May–August 2026. Revenue matching the monthly breakdown. Related-party not mixed into arms-length. Expenses matching COGS / marketing / R&D / G&A. Even if most cells are 0, file it. A blank upload fails the form.

---

### Agentic Economy Prize — Are you opting into the external $50K Agentic Economy Prize

**No.**

Circle is independently judged. They want a public repo that shows the integration, an agent wallet address, and a block-explorer URL for a real transaction. We do not have a Circle wallet in this product. We do not settle in USDC. Our money movement is Paystack and Dodo. Opting in with empty or fake fields is how you look sloppy on the main XPRIZE submission. If we ever put an agent on a Circle wallet, that is a different day.

---

### Agentic Economy Prize — A link to a public GitHub repo verifying the integration.

*Leave blank (required only if we opt in).*

---

### Agentic Economy Prize — The agent's Circle wallet address as proof of the transaction.

*Leave blank.*

---

### Agentic Economy Prize — The agent's clickable block-explorer URL as proof of the transaction.

*Leave blank.*
