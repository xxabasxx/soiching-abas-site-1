import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// اسکریپت هوشمند افزودن چک‌باکس انتخاب ردیف‌ها برای پرینت (سازگار با ویندوز ۷)
if (typeof window !== "undefined") {
  setInterval(() => {
    // یافتن تمام ردیف‌های جدول محاسبات
    const rows = document.querySelectorAll("tr");
    rows.forEach((tr) => {
      const firstTd = tr.querySelector("td");
      if (firstTd && !firstTd.querySelector(".print-check")) {
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = true;
        cb.className = "print-check";
        cb.title = "تیک بزنید تا این ردیف در پرینت چاپ شود";
        
        // وقتی تیک برداشته شد، کلاس no-print اضافه می‌شود
        cb.onchange = () => {
          if (cb.checked) {
            tr.classList.remove("no-print");
          } else {
            tr.classList.add("no-print");
          }
        };

        cb.onclick = (e) => e.stopPropagation();
        firstTd.insertBefore(cb, firstTd.firstChild);
      }
    });
  }, 1000);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
