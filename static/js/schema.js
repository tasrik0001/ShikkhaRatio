(function () {
  "use strict";

  var SITE_NAME = "ShikkhaRatio";

  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  function injectJsonLd(data) {
    var script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  function metaDescription() {
    var tag = document.querySelector('meta[name="description"]');
    return tag ? tag.getAttribute("content") : "";
  }

  function pageTitle() {
    return document.title || SITE_NAME;
  }

  function headingText() {
    var h1 = document.querySelector("h1");
    return h1 ? h1.textContent.trim() : "";
  }

  function pageKind() {
    var path = window.location.pathname.replace(/\/+$/, "");
    var file = path.split("/").pop();
    return file.replace(/\.html$/, "") || "index";
  }

  function isDatasetPage() {
    var kind = pageKind();
    return kind === "explore" || kind === "sources";
  }

  function buildWebSite() {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      alternateName: "Shikkha Ratio",
      url: window.location.origin + "/",
      description:
        metaDescription() ||
        "Education figures for Bangladesh, seen district by district.",
      inLanguage: document.documentElement.lang || "en",
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        url: window.location.origin + "/"
      }
    };
  }

  function buildDataset() {
    var description =
      metaDescription() ||
      headingText() ||
      "District level student and teacher figures for Bangladesh, based on BANBEIS 2024.";
    return {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "Bangladesh district education statistics, 2024",
      description: description,
      keywords:
        "Bangladesh education, BANBEIS 2024, students per teacher, district statistics, teacher distribution, secondary schools, colleges",
      url: window.location.href,
      isAccessibleForFree: true,
      creator: {
        "@type": "Organization",
        name: SITE_NAME,
        url: window.location.origin + "/"
      },
      sourceOrganization: {
        "@type": "GovernmentOrganization",
        name: "Bangladesh Bureau of Educational Information and Statistics",
        alternateName: "BANBEIS",
        url: "https://banbeis.gov.bd/"
      },
      temporalCoverage: "2024",
      license: "https://opensource.org/licenses/MIT",
      abstract:
        "District summaries derived from BANBEIS 2024. Credit BANBEIS 2024 as the underlying data source and ShikkhaRatio for the summaries and calculations."
    };
  }

  function collectFaqItems() {
    var nodes = document.querySelectorAll(".faq");
    var items = [];
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      var questionEl =
        node.querySelector("h2, h3, h4, dt, summary, [itemprop='name']") || node;
      var answerEl =
        node.querySelector("dd, p, [itemprop='text']") || questionEl.nextElementSibling;
      var question = questionEl.textContent.trim();
      var answer = answerEl ? answerEl.textContent.trim() : "";
      if (question && answer && question !== answer) {
        items.push({
          "@type": "Question",
          name: question,
          acceptedAnswer: {
            "@type": "Answer",
            text: answer
          }
        });
      }
    }
    return items;
  }

  function buildFaqPage(items) {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items
    };
  }

  function apply() {
    injectJsonLd(buildWebSite());

    if (isDatasetPage()) {
      injectJsonLd(buildDataset());
    }

    var faqItems = collectFaqItems();
    if (faqItems.length > 0) {
      injectJsonLd(buildFaqPage(faqItems));
    }
  }

  onReady(apply);
})();
