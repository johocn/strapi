import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // ===== Organization =====
  buildOrganization(brandInfo: any, seoConfig: any): any {
    const org: any = {
      "@context": "https://schema.org",
      "@type": seoConfig?.organizationType || "Organization",
      name: brandInfo?.companyName,
      url: brandInfo?.url || "",
    };
    if (brandInfo?.logo) org.logo = brandInfo.logo.url;
    if (brandInfo?.description) org.description = brandInfo.description;
    if (brandInfo?.foundingDate) org.foundingDate = brandInfo.foundingDate;
    if (brandInfo?.registeredAddress) org.address = {
      "@type": "PostalAddress",
      streetAddress: brandInfo.registeredAddress,
    };
    if (brandInfo?.contactPhone) org.contactPoint = {
      "@type": "ContactPoint",
      telephone: brandInfo.contactPhone,
      contactType: "customer service",
    };
    if (seoConfig?.schemaSameAs) org.sameAs = seoConfig.schemaSameAs;
    if (seoConfig?.schemaContactPoint) org.contactPoint = seoConfig.schemaContactPoint;
    return org;
  },

  // ===== Article =====
  buildArticle(article: any, brandInfo: any): any {
    const schema: any = {
      "@context": "https://schema.org",
      "@type": article.schemaType || "Article",
      headline: article.seoTitle || article.title,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
      author: {
        "@type": "Person",
        name: article.author || brandInfo?.companyName || "",
      },
    };
    if (article.seoDescription) schema.description = article.seoDescription;
    if (article.coverImage) schema.image = article.coverImage.url;
    if (article.canonicalUrl) schema.mainEntityOfPage = {
      "@type": "WebPage",
      "@id": article.canonicalUrl,
    };
    if (brandInfo?.companyName) schema.publisher = {
      "@type": "Organization",
      name: brandInfo.companyName,
    };
    if (article.brandVoiceRef?.content) {
      schema.brand = {
        "@type": "Brand",
        name: article.brandVoiceRef.name,
        description: article.brandVoiceRef.content,
      };
    }
    return schema;
  },

  // ===== Product =====
  buildProduct(product: any, brandInfo: any): any {
    const schema: any = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.seoTitle || product.name,
    };
    if (product.description) schema.description = product.description;
    if (product.coverImage) schema.image = product.coverImage.url;
    if (product.brand) schema.brand = { "@type": "Brand", name: product.brand };
    if (product.specifications) {
      schema.additionalProperty = product.specifications.map((s: any) => ({
        "@type": "PropertyValue",
        name: s.name,
        value: s.value,
      }));
    }
    if (product.priceRange) schema.offers = {
      "@type": "Offer",
      priceSpecification: { "@type": "PriceSpecification", priceCurrency: "CNY" },
    };
    return schema;
  },

  // ===== HowTo (tutorial) =====
  buildHowTo(tutorial: any): any {
    const schema: any = {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: tutorial.title,
    };
    if (tutorial.description) schema.description = tutorial.description;
    if (tutorial.steps) {
      schema.step = tutorial.steps.map((step: any, i: number) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: step.title,
        text: step.content,
      }));
    }
    if (tutorial.estimatedTime) schema.totalTime = tutorial.estimatedTime;
    return schema;
  },

  // ===== FAQ =====
  buildFAQ(faqs: any[]): any {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    };
  },

  // ===== BreadcrumbList =====
  buildBreadcrumb(items: Array<{ name: string; url: string }>): any {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        item: item.url,
      })),
    };
  },

  // ===== WebSite =====
  buildWebSite(seoConfig: any, siteUrl: string): any {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: seoConfig?.organizationName || "",
      url: siteUrl,
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    };
  },
});
