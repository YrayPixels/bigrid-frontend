"use client";

import { ContentPageView } from "@/components/storefront/pages/content-page-view";
import { DELETE_DATA_PAGE, STOREFRONT_DELETE_DATA_DEFAULT_BODY } from "@/lib/legal/delete-data";
import { useStorefront } from "@/lib/storefront/store-context";

export default function DeleteDatePageClient() {
  const { store } = useStorefront();
  const storeName = store.business_name?.trim() || "this store";
  const contactEmail = DELETE_DATA_PAGE.contactEmail;

  const body = `${STOREFRONT_DELETE_DATA_DEFAULT_BODY}

Store: ${storeName}

Email ${contactEmail} with subject "Data deletion request" to start. See our privacy policy for more on how we handle personal information.`;

  return <ContentPageView title="Delete your data" body={body} />;
}
