export const DELETE_DATA_PAGE = {
  title: "Delete your data",
  lastUpdated: "September 1, 2026",
  contactEmail: "support@bizgrid.ai",
  sections: [
    {
      heading: "Overview",
      body: `You can request deletion of personal information Bizgrid holds about you. This page explains what we delete, what we may retain, and how to submit a request.

Depending on how you use Bizgrid, your data may be held as a merchant account holder, a signed-in shopper on a storefront, or a guest who placed an order.`,
    },
    {
      heading: "What we can delete",
      body: `When we approve a deletion request, we remove or anonymize personal information such as:

• Merchant account profile details (name, email, phone)
• Signed-in shopper account details linked to Google sign-in
• Virtual try-on session images and related AI styling data tied to your account
• Marketing preferences and non-transactional communications data

We process requests for data connected to the email address you use with Bizgrid or the store where you shopped.`,
    },
    {
      heading: "What we may retain",
      body: `Some information may be kept where required by law or for legitimate business purposes, including:

• Order, payment, and payout records needed for tax, accounting, fraud prevention, or chargeback resolution
• Anonymized or aggregated analytics that no longer identify you
• Information we must keep to comply with legal obligations or enforce our terms

When we retain data, we limit access and use it only for those permitted purposes.`,
    },
    {
      heading: "How to request deletion",
      body: `Email support@bizgrid.ai from the address associated with your Bizgrid or storefront account. Include:

• The email address tied to your account or order
• The store name or URL, if your request relates to a specific storefront
• A short note that you are requesting deletion of your personal data

We may ask you to verify your identity before processing the request. We aim to respond within 30 days.`,
    },
    {
      heading: "Merchant accounts",
      body: `If you operate a Bizgrid merchant account, close or pause active billing before requesting deletion where possible. Deleting a merchant account removes admin access, storefront configuration, and associated personal profile data subject to the retention rules above.`,
    },
    {
      heading: "Storefront shoppers",
      body: `If you signed in with Google on a store to use features such as virtual try-on, we can delete the shopper profile and related session data linked to that sign-in.

If you checked out as a guest, include your order email and order number in your request so we can locate the correct records.`,
    },
    {
      heading: "Questions",
      body: `For questions about this process or your privacy rights, contact support@bizgrid.ai or review our Privacy Policy.`,
    },
  ],
} as const;

export const STOREFRONT_DELETE_DATA_DEFAULT_BODY = `You can request deletion of personal information this store and Bizgrid hold about you.

Email support@bizgrid.ai from the address you used to shop or sign in. Include the store name, your email address, and any order number if you checked out as a guest.

We may ask you to verify your identity before processing your request. Some order and payment records may be retained where required by law.`;
