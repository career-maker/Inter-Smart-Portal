// Sales Team Documentation sheet: sections, questions and dropdown values. Keep in step with backend/app/Support/SalesSheet.php.
export type SheetField = { key: string; label: string; type: "text" | "textarea" | "number" | "date" | "select"; options?: string[] };
export const SALES_SHEET: { title: string; fields: SheetField[] }[] = [
 {
  "title": "Project info",
  "fields": [
   {
    "key": "project_type",
    "label": "Project category (type)",
    "type": "select",
    "options": [
     "CMS_Next_Node_10",
     "CMS_Next_Node_X",
     "CMS_Next_PHP_10",
     "CMS_Next_PHP_X",
     "CMS_Next_Strapi_10",
     "CMS_Next_Strapi_X",
     "CMS_Word_Theme",
     "CMS_Next_WP_10",
     "CMS_Next_WP_X",
     "CMS_PHP_Cust_10",
     "CMS_PHP_Cust_X",
     "CMS_Word_Cust_10",
     "CMS_Word_Cust_X",
     "Ecommerce_Next_Node_Basic",
     "Ecommerce_Next_Node_LS",
     "Ecommerce_Next_Node_MS",
     "Ecommerce_PHP_EL_50",
     "Ecommerce_PHP_MS_10",
     "Woocommerce_Theme_X",
     "Woocommerce_EL_70",
     "Woocommerce_MS_30",
     "Shopify",
     "HTML Static Site",
     "Design Only",
     "Custom App/ Mobile App",
     "Website Corrections / Bug Fixing",
     "Business Collateral",
     "AI Website"
    ]
   },
   {
    "key": "client_level",
    "label": "Client level",
    "type": "select",
    "options": [
     "High",
     "Medium"
    ]
   },
   {
    "key": "project_purpose",
    "label": "Project purpose",
    "type": "textarea"
   },
   {
    "key": "demo_design",
    "label": "Demo design given (if any)",
    "type": "text"
   },
   {
    "key": "ba_report_shared",
    "label": "BA report shared with client (if any)",
    "type": "text"
   },
   {
    "key": "delivery_days",
    "label": "Delivery as per proposal (days)",
    "type": "number"
   },
   {
    "key": "committed_timeline",
    "label": "Committed timeline (days/date)",
    "type": "text"
   },
   {
    "key": "specific_requirement",
    "label": "Specific requirement (if any)",
    "type": "textarea"
   }
  ]
 },
 {
  "title": "Client info",
  "fields": [
   {
    "key": "client_relationship",
    "label": "Client relationship",
    "type": "select",
    "options": [
     "New",
     "Existing"
    ]
   },
   {
    "key": "priority",
    "label": "Project priority",
    "type": "select",
    "options": [
     "High",
     "Medium"
    ]
   },
   {
    "key": "stakeholder",
    "label": "Client/Stakeholder",
    "type": "text"
   },
   {
    "key": "poc_name",
    "label": "Client POC name",
    "type": "text"
   },
   {
    "key": "poc_phone",
    "label": "Client POC contact number",
    "type": "text"
   },
   {
    "key": "poc_email",
    "label": "Client POC email address",
    "type": "text"
   },
   {
    "key": "website_url",
    "label": "Current website URL (if any)",
    "type": "text"
   },
   {
    "key": "competitors",
    "label": "Competitors (if any)",
    "type": "text"
   },
   {
    "key": "references",
    "label": "References (if any)",
    "type": "text"
   },
   {
    "key": "business_model",
    "label": "Business model",
    "type": "select",
    "options": [
     "B2C",
     "B2B",
     "Both"
    ]
   },
   {
    "key": "audience",
    "label": "Targeted audience (if any)",
    "type": "text"
   },
   {
    "key": "locations",
    "label": "Targeted locations (if any)",
    "type": "text"
   },
   {
    "key": "company_overview",
    "label": "Company overview (services, industries, products)",
    "type": "textarea"
   },
   {
    "key": "turnover",
    "label": "Turnover, employee strength and branches",
    "type": "text"
   }
  ]
 },
 {
  "title": "Project scope",
  "fields": [
   {
    "key": "logo_brand",
    "label": "Logo and brand guideline",
    "type": "select",
    "options": [
     "By Client",
     "By Inter Smart"
    ]
   },
   {
    "key": "domain_by",
    "label": "Domain by",
    "type": "select",
    "options": [
     "Client Side",
     "Inter Smart"
    ]
   },
   {
    "key": "hosting_by",
    "label": "Hosting by",
    "type": "select",
    "options": [
     "Client",
     "Inter 2 GB",
     "Inter 2 GB Plus",
     "Inter 5 GB",
     "Inter 5 GB  HBW",
     "Inter 10 GB",
     "Inter 10 GB HBW",
     "Inter 20 GB",
     "Inter 30 GB",
     "VM1",
     "VM2",
     "VM3",
     "Custom Package"
    ]
   },
   {
    "key": "ba_committed",
    "label": "BA report committed? (deliverables)",
    "type": "text"
   },
   {
    "key": "unique_pages",
    "label": "Total number of unique pages",
    "type": "number"
   },
   {
    "key": "design_iterations",
    "label": "Allowed design iterations",
    "type": "select",
    "options": [
     "1",
     "2",
     "3",
     "3+"
    ]
   },
   {
    "key": "custom_mobile",
    "label": "Custom mobile design committed?",
    "type": "select",
    "options": [
     "No",
     "Homepage Only",
     "All Pages"
    ]
   },
   {
    "key": "website_images",
    "label": "Website images",
    "type": "select",
    "options": [
     "Client Side",
     "Stock Images"
    ]
   },
   {
    "key": "online_chat",
    "label": "Online chat",
    "type": "select",
    "options": [
     "Yes",
     "No"
    ]
   },
   {
    "key": "popup",
    "label": "Pop up",
    "type": "select",
    "options": [
     "Yes",
     "No"
    ]
   },
   {
    "key": "cookies",
    "label": "Cookies user consent",
    "type": "select",
    "options": [
     "Yes",
     "No"
    ]
   },
   {
    "key": "multilingual",
    "label": "Multi-lingual website (which languages)",
    "type": "text"
   },
   {
    "key": "wp_forms",
    "label": "WP Forms for WordPress",
    "type": "select",
    "options": [
     "Paid",
     "Free for First Year - Client Approved",
     "Cracked Version",
     "Not WP"
    ]
   },
   {
    "key": "acf_pro",
    "label": "ACF Pro for WordPress",
    "type": "select",
    "options": [
     "Paid",
     "Free for First Year - Client Approved",
     "Cracked Version",
     "Not WP"
    ]
   },
   {
    "key": "wp_rocket",
    "label": "WP Rocket for WordPress",
    "type": "select",
    "options": [
     "Paid",
     "Free for First Year - Client Approved",
     "Cracked Version",
     "Not WP"
    ]
   },
   {
    "key": "seo_content",
    "label": "SEO content writing in scope (word count)",
    "type": "text"
   },
   {
    "key": "content_updation",
    "label": "Content updation",
    "type": "select",
    "options": [
     "NIL",
     "Basic Content",
     "Basic + Product Update",
     "By Client"
    ]
   },
   {
    "key": "page_insight",
    "label": "Google page insight ranking (committed figures)",
    "type": "text"
   },
   {
    "key": "free_support_months",
    "label": "Free support post launch (months)",
    "type": "number"
   }
  ]
 },
 {
  "title": "In-house",
  "fields": [
   {
    "key": "advance_received",
    "label": "Advance received",
    "type": "select",
    "options": [
     "Yes",
     "No"
    ]
   },
   {
    "key": "override_approval",
    "label": "If no, override approval received from",
    "type": "select",
    "options": [
     "Jithin",
     "Rony"
    ]
   },
   {
    "key": "confirmed_date",
    "label": "Project confirmed date",
    "type": "date"
   },
   {
    "key": "change_approval",
    "label": "Change request approval to be obtained from",
    "type": "select",
    "options": [
     "Jithin",
     "Rony",
     "Shaino/Jissa",
     "Sunil"
    ]
   },
   {
    "key": "comments",
    "label": "Additional comments (if any)",
    "type": "textarea"
   }
  ]
 }
];
