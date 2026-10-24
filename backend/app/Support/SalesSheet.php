<?php

namespace App\Support;

/** Sales Team Documentation sheet: the allowed answer keys for project_intake.details, and the dropdown values where the sheet has them (null = free text). */
class SalesSheet
{
    public static function fields(): array
    {
        return [
        'project_type' => ['CMS_Next_Node_10', 'CMS_Next_Node_X', 'CMS_Next_PHP_10', 'CMS_Next_PHP_X', 'CMS_Next_Strapi_10', 'CMS_Next_Strapi_X', 'CMS_Word_Theme', 'CMS_Next_WP_10', 'CMS_Next_WP_X', 'CMS_PHP_Cust_10', 'CMS_PHP_Cust_X', 'CMS_Word_Cust_10', 'CMS_Word_Cust_X', 'Ecommerce_Next_Node_Basic', 'Ecommerce_Next_Node_LS', 'Ecommerce_Next_Node_MS', 'Ecommerce_PHP_EL_50', 'Ecommerce_PHP_MS_10', 'Woocommerce_Theme_X', 'Woocommerce_EL_70', 'Woocommerce_MS_30', 'Shopify', 'HTML Static Site', 'Design Only', 'Custom App/ Mobile App', 'Website Corrections / Bug Fixing', 'Business Collateral', 'AI Website'],
        'client_level' => ['High', 'Medium'],
        'project_purpose' => null,
        'demo_design' => null,
        'ba_report_shared' => null,
        'delivery_days' => null,
        'committed_timeline' => null,
        'specific_requirement' => null,
        'client_relationship' => ['New', 'Existing'],
        'priority' => ['High', 'Medium'],
        'stakeholder' => null,
        'poc_name' => null,
        'poc_phone' => null,
        'poc_email' => null,
        'website_url' => null,
        'competitors' => null,
        'references' => null,
        'business_model' => ['B2C', 'B2B', 'Both'],
        'audience' => null,
        'locations' => null,
        'company_overview' => null,
        'turnover' => null,
        'logo_brand' => ['By Client', 'By Inter Smart'],
        'domain_by' => ['Client Side', 'Inter Smart'],
        'hosting_by' => ['Client', 'Inter 2 GB', 'Inter 2 GB Plus', 'Inter 5 GB', 'Inter 5 GB  HBW', 'Inter 10 GB', 'Inter 10 GB HBW', 'Inter 20 GB', 'Inter 30 GB', 'VM1', 'VM2', 'VM3', 'Custom Package'],
        'ba_committed' => null,
        'unique_pages' => null,
        'design_iterations' => ['1', '2', '3', '3+'],
        'custom_mobile' => ['No', 'Homepage Only', 'All Pages'],
        'website_images' => ['Client Side', 'Stock Images'],
        'online_chat' => ['Yes', 'No'],
        'popup' => ['Yes', 'No'],
        'cookies' => ['Yes', 'No'],
        'multilingual' => null,
        'wp_forms' => ['Paid', 'Free for First Year - Client Approved', 'Cracked Version', 'Not WP'],
        'acf_pro' => ['Paid', 'Free for First Year - Client Approved', 'Cracked Version', 'Not WP'],
        'wp_rocket' => ['Paid', 'Free for First Year - Client Approved', 'Cracked Version', 'Not WP'],
        'seo_content' => null,
        'content_updation' => ['NIL', 'Basic Content', 'Basic + Product Update', 'By Client'],
        'page_insight' => null,
        'free_support_months' => null,
        'advance_received' => ['Yes', 'No'],
        'override_approval' => ['Jithin', 'Rony'],
        'confirmed_date' => null,
        'change_approval' => ['Jithin', 'Rony', 'Shaino/Jissa', 'Sunil'],
        'comments' => null,
        ];
    }

    /** Error message for the first answer that is not a sheet question or not one of its dropdown values, else null. */
    public static function problem(array $details): ?string
    {
        $fields = self::fields();
        foreach ($details as $key => $value) {
            if (! array_key_exists($key, $fields)) {
                return "Unknown sheet question: {$key}.";
            }
            if ($value !== null && $value !== '' && $fields[$key] !== null && ! in_array($value, $fields[$key], true)) {
                return "\"{$value}\" is not an allowed answer for {$key}.";
            }
        }

        return null;
    }
}
