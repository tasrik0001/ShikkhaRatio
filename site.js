const today = document.getElementById("today");
if (today) {
  const date = new Date();
  today.textContent = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  today.dateTime = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const savedSelection = new URLSearchParams(window.location.search);
for (const link of document.querySelectorAll("a[href]:not([data-fixed-selection])")) {
  const url = new URL(link.href);
  if (url.origin === window.location.origin && url.pathname.endsWith(".html") && savedSelection.has("sector")) {
    url.searchParams.set("sector", savedSelection.get("sector"));
    url.searchParams.set("district", savedSelection.get("district") || "all");
    link.href = url.href;
  }
}
