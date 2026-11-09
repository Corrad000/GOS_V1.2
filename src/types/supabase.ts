
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "gos_audit_log": {
                  Row: {
                    "action": string,"entity_id": string | null,"entity_type": string,"id": string,"ip_address": string | null,"metadata": Json | null,"new_values": Json | null,"old_values": Json | null,"timestamp": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"entity_id"?: string | null,"entity_type": string,"id"?: string,"ip_address"?: string | null,"metadata"?: Json | null,"new_values"?: Json | null,"old_values"?: Json | null,"timestamp"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"entity_id"?: string | null,"entity_type"?: string,"id"?: string,"ip_address"?: string | null,"metadata"?: Json | null,"new_values"?: Json | null,"old_values"?: Json | null,"timestamp"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_audit_log_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "gos_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_aziende": {
                  Row: {
                    "cap": string | null,"citta": string | null,"codice_fiscale": string | null,"created_at": string,"dipendenti": number | null,"email": string | null,"fatturato": number | null,"id": string,"indirizzo": string | null,"industry": string | null,"nome_commerciale": string | null,"owner_id": string | null,"paese": string | null,"ragione_sociale": string,"sito_web": string | null,"stato": Database["public"]['Enums']["gos_company_status"],"telefono": string | null,"updated_at": string,"vat": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cap"?: string | null,"citta"?: string | null,"codice_fiscale"?: string | null,"created_at"?: string,"dipendenti"?: number | null,"email"?: string | null,"fatturato"?: number | null,"id"?: string,"indirizzo"?: string | null,"industry"?: string | null,"nome_commerciale"?: string | null,"owner_id"?: string | null,"paese"?: string | null,"ragione_sociale": string,"sito_web"?: string | null,"stato"?: Database["public"]['Enums']["gos_company_status"],"telefono"?: string | null,"updated_at"?: string,"vat"?: string | null
                  }
                  Update: {
                    "cap"?: string | null,"citta"?: string | null,"codice_fiscale"?: string | null,"created_at"?: string,"dipendenti"?: number | null,"email"?: string | null,"fatturato"?: number | null,"id"?: string,"indirizzo"?: string | null,"industry"?: string | null,"nome_commerciale"?: string | null,"owner_id"?: string | null,"paese"?: string | null,"ragione_sociale"?: string,"sito_web"?: string | null,"stato"?: Database["public"]['Enums']["gos_company_status"],"telefono"?: string | null,"updated_at"?: string,"vat"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_aziende_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "gos_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_company_assignments": {
                  Row: {
                    "advisor_id": string,"assigned_by": string | null,"company_id": string,"created_at": string,"id": string,"permission_level": string
                  }
                  ComputedFields: never
                  Insert: {
                    "advisor_id": string,"assigned_by"?: string | null,"company_id": string,"created_at"?: string,"id"?: string,"permission_level"?: string
                  }
                  Update: {
                    "advisor_id"?: string,"assigned_by"?: string | null,"company_id"?: string,"created_at"?: string,"id"?: string,"permission_level"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_company_assignments_advisor_id_fkey"
      columns: ["advisor_id"]
isOneToOne: false
      referencedRelation: "gos_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_company_assignments_assigned_by_fkey"
      columns: ["assigned_by"]
isOneToOne: false
      referencedRelation: "gos_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_company_assignments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "gos_aziende"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_cost_components": {
                  Row: {
                    "component_name": string,"cost_item_id": string,"id": string,"sort_order": number | null,"unit_cost": number
                  }
                  ComputedFields: never
                  Insert: {
                    "component_name": string,"cost_item_id": string,"id"?: string,"sort_order"?: number | null,"unit_cost"?: number
                  }
                  Update: {
                    "component_name"?: string,"cost_item_id"?: string,"id"?: string,"sort_order"?: number | null,"unit_cost"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_cost_components_cost_item_id_fkey"
      columns: ["cost_item_id"]
isOneToOne: false
      referencedRelation: "gos_cost_items"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_cost_forecasts": {
                  Row: {
                    "amount": number,"cost_item_id": string,"id": string,"period_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number,"cost_item_id": string,"id"?: string,"period_id": string
                  }
                  Update: {
                    "amount"?: number,"cost_item_id"?: string,"id"?: string,"period_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_cost_forecasts_cost_item_id_fkey"
      columns: ["cost_item_id"]
isOneToOne: false
      referencedRelation: "gos_cost_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_cost_forecasts_period_id_fkey"
      columns: ["period_id"]
isOneToOne: false
      referencedRelation: "gos_financial_periods"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_cost_items": {
                  Row: {
                    "calculation_mode": string,"category": string,"cost_driver_id": string | null,"created_at": string,"default_amount": number,"description": string | null,"financial_model_id": string,"id": string,"is_active": boolean,"name": string,"sort_order": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "calculation_mode"?: string,"category": string,"cost_driver_id"?: string | null,"created_at"?: string,"default_amount"?: number,"description"?: string | null,"financial_model_id": string,"id"?: string,"is_active"?: boolean,"name": string,"sort_order"?: number | null
                  }
                  Update: {
                    "calculation_mode"?: string,"category"?: string,"cost_driver_id"?: string | null,"created_at"?: string,"default_amount"?: number,"description"?: string | null,"financial_model_id"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"sort_order"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_cost_items_cost_driver_id_fkey"
      columns: ["cost_driver_id"]
isOneToOne: false
      referencedRelation: "gos_revenue_lines"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_cost_items_financial_model_id_fkey"
      columns: ["financial_model_id"]
isOneToOne: false
      referencedRelation: "gos_financial_models"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_document_templates": {
                  Row: {
                    "category": string,"code": string,"content": string,"created_at": string,"id": string,"is_approved": boolean,"title": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"code": string,"content": string,"created_at"?: string,"id"?: string,"is_approved"?: boolean,"title": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "category"?: string,"code"?: string,"content"?: string,"created_at"?: string,"id"?: string,"is_approved"?: boolean,"title"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"gos_documents": {
                  Row: {
                    "company_id": string | null,"created_at": string,"created_by": string | null,"document_type": string,"engagement_id": string | null,"file_path": string,"id": string,"project_id": string | null,"title": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"document_type": string,"engagement_id"?: string | null,"file_path": string,"id"?: string,"project_id"?: string | null,"title": string,"version"?: number
                  }
                  Update: {
                    "company_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"document_type"?: string,"engagement_id"?: string | null,"file_path"?: string,"id"?: string,"project_id"?: string | null,"title"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_documents_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "gos_aziende"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_documents_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "gos_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_documents_engagement_id_fkey"
      columns: ["engagement_id"]
isOneToOne: false
      referencedRelation: "gos_engagements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_documents_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "gos_progetti"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_engagement_offers": {
                  Row: {
                    "additional_costs": string | null,"assumptions": string | null,"business_problem": string | null,"client_responsibilities": string | null,"company_id": string,"created_at": string,"deliverables": string | null,"engagement_id": string,"fees_amount": number,"glaring_responsibilities": string | null,"id": string,"limitations": string | null,"methodology": string | null,"objective": string | null,"payment_terms": string | null,"resources_details": string | null,"scope_excluded": string | null,"scope_included": string | null,"status": string,"timeline_details": string | null,"title": string,"updated_at": string,"validity_date": string | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "additional_costs"?: string | null,"assumptions"?: string | null,"business_problem"?: string | null,"client_responsibilities"?: string | null,"company_id": string,"created_at"?: string,"deliverables"?: string | null,"engagement_id": string,"fees_amount"?: number,"glaring_responsibilities"?: string | null,"id"?: string,"limitations"?: string | null,"methodology"?: string | null,"objective"?: string | null,"payment_terms"?: string | null,"resources_details"?: string | null,"scope_excluded"?: string | null,"scope_included"?: string | null,"status"?: string,"timeline_details"?: string | null,"title": string,"updated_at"?: string,"validity_date"?: string | null,"version"?: number
                  }
                  Update: {
                    "additional_costs"?: string | null,"assumptions"?: string | null,"business_problem"?: string | null,"client_responsibilities"?: string | null,"company_id"?: string,"created_at"?: string,"deliverables"?: string | null,"engagement_id"?: string,"fees_amount"?: number,"glaring_responsibilities"?: string | null,"id"?: string,"limitations"?: string | null,"methodology"?: string | null,"objective"?: string | null,"payment_terms"?: string | null,"resources_details"?: string | null,"scope_excluded"?: string | null,"scope_included"?: string | null,"status"?: string,"timeline_details"?: string | null,"title"?: string,"updated_at"?: string,"validity_date"?: string | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_engagement_offers_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "gos_aziende"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_engagement_offers_engagement_id_fkey"
      columns: ["engagement_id"]
isOneToOne: false
      referencedRelation: "gos_engagements"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_engagements": {
                  Row: {
                    "company_id": string,"created_at": string,"engagement_type": string,"id": string,"objective": string | null,"status": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"engagement_type": string,"id"?: string,"objective"?: string | null,"status"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"engagement_type"?: string,"id"?: string,"objective"?: string | null,"status"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_engagements_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "gos_aziende"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_financial_assets": {
                  Row: {
                    "acquisition_cost": number,"asset_name": string,"capitalizable_costs": number,"category": string,"created_at": string,"depreciation_method": string,"financial_model_id": string,"id": string,"in_service_date": string,"purchase_date": string,"residual_value": number,"useful_life_months": number
                  }
                  ComputedFields: never
                  Insert: {
                    "acquisition_cost"?: number,"asset_name": string,"capitalizable_costs"?: number,"category": string,"created_at"?: string,"depreciation_method"?: string,"financial_model_id": string,"id"?: string,"in_service_date": string,"purchase_date": string,"residual_value"?: number,"useful_life_months"?: number
                  }
                  Update: {
                    "acquisition_cost"?: number,"asset_name"?: string,"capitalizable_costs"?: number,"category"?: string,"created_at"?: string,"depreciation_method"?: string,"financial_model_id"?: string,"id"?: string,"in_service_date"?: string,"purchase_date"?: string,"residual_value"?: number,"useful_life_months"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_financial_assets_financial_model_id_fkey"
      columns: ["financial_model_id"]
isOneToOne: false
      referencedRelation: "gos_financial_models"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_financial_debt": {
                  Row: {
                    "annual_interest_rate": number,"created_at": string,"disbursement_date": string,"duration_months": number,"financial_model_id": string,"grace_period_months": number,"id": string,"loan_name": string,"loan_type": string,"principal_amount": number,"repayment_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "annual_interest_rate"?: number,"created_at"?: string,"disbursement_date": string,"duration_months"?: number,"financial_model_id": string,"grace_period_months"?: number,"id"?: string,"loan_name": string,"loan_type"?: string,"principal_amount"?: number,"repayment_type"?: string
                  }
                  Update: {
                    "annual_interest_rate"?: number,"created_at"?: string,"disbursement_date"?: string,"duration_months"?: number,"financial_model_id"?: string,"grace_period_months"?: number,"id"?: string,"loan_name"?: string,"loan_type"?: string,"principal_amount"?: number,"repayment_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_financial_debt_financial_model_id_fkey"
      columns: ["financial_model_id"]
isOneToOne: false
      referencedRelation: "gos_financial_models"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_financial_kpis": {
                  Row: {
                    "financial_model_id": string,"id": string,"kpi_name": string,"kpi_value": number,"period_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "financial_model_id": string,"id"?: string,"kpi_name": string,"kpi_value"?: number,"period_id": string
                  }
                  Update: {
                    "financial_model_id"?: string,"id"?: string,"kpi_name"?: string,"kpi_value"?: number,"period_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_financial_kpis_financial_model_id_fkey"
      columns: ["financial_model_id"]
isOneToOne: false
      referencedRelation: "gos_financial_models"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_financial_kpis_period_id_fkey"
      columns: ["period_id"]
isOneToOne: false
      referencedRelation: "gos_financial_periods"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_financial_models": {
                  Row: {
                    "base_currency": string,"company_id": string,"created_at": string,"horizon_months": number,"id": string,"model_name": string,"model_type": string,"project_id": string | null,"scenario": string,"start_date": string,"status": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "base_currency"?: string,"company_id": string,"created_at"?: string,"horizon_months"?: number,"id"?: string,"model_name": string,"model_type"?: string,"project_id"?: string | null,"scenario"?: string,"start_date": string,"status"?: string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "base_currency"?: string,"company_id"?: string,"created_at"?: string,"horizon_months"?: number,"id"?: string,"model_name"?: string,"model_type"?: string,"project_id"?: string | null,"scenario"?: string,"start_date"?: string,"status"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_financial_models_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "gos_aziende"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_financial_models_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "gos_progetti"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_financial_periods": {
                  Row: {
                    "financial_model_id": string,"id": string,"month": number,"period_date": string,"period_index": number,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "financial_model_id": string,"id"?: string,"month": number,"period_date": string,"period_index": number,"year": number
                  }
                  Update: {
                    "financial_model_id"?: string,"id"?: string,"month"?: number,"period_date"?: string,"period_index"?: number,"year"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_financial_periods_financial_model_id_fkey"
      columns: ["financial_model_id"]
isOneToOne: false
      referencedRelation: "gos_financial_models"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_financial_results": {
                  Row: {
                    "closing_cash": number,"depreciation_amortization": number,"ebit": number,"ebitda": number,"ebt": number,"financial_expenses": number,"financial_income": number,"financial_model_id": string,"financing_cash_flow": number,"gross_profit": number,"gross_revenue": number,"id": string,"investing_cash_flow": number,"net_cash_flow": number,"net_profit": number,"net_revenue": number,"opening_cash": number,"operating_cash_flow": number,"period_id": string,"sales_adjustments": number,"taxes": number,"total_assets": number,"total_cogs": number,"total_equity": number,"total_liabilities": number,"total_opex": number
                  }
                  ComputedFields: never
                  Insert: {
                    "closing_cash"?: number,"depreciation_amortization"?: number,"ebit"?: number,"ebitda"?: number,"ebt"?: number,"financial_expenses"?: number,"financial_income"?: number,"financial_model_id": string,"financing_cash_flow"?: number,"gross_profit"?: number,"gross_revenue"?: number,"id"?: string,"investing_cash_flow"?: number,"net_cash_flow"?: number,"net_profit"?: number,"net_revenue"?: number,"opening_cash"?: number,"operating_cash_flow"?: number,"period_id": string,"sales_adjustments"?: number,"taxes"?: number,"total_assets"?: number,"total_cogs"?: number,"total_equity"?: number,"total_liabilities"?: number,"total_opex"?: number
                  }
                  Update: {
                    "closing_cash"?: number,"depreciation_amortization"?: number,"ebit"?: number,"ebitda"?: number,"ebt"?: number,"financial_expenses"?: number,"financial_income"?: number,"financial_model_id"?: string,"financing_cash_flow"?: number,"gross_profit"?: number,"gross_revenue"?: number,"id"?: string,"investing_cash_flow"?: number,"net_cash_flow"?: number,"net_profit"?: number,"net_revenue"?: number,"opening_cash"?: number,"operating_cash_flow"?: number,"period_id"?: string,"sales_adjustments"?: number,"taxes"?: number,"total_assets"?: number,"total_cogs"?: number,"total_equity"?: number,"total_liabilities"?: number,"total_opex"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_financial_results_financial_model_id_fkey"
      columns: ["financial_model_id"]
isOneToOne: false
      referencedRelation: "gos_financial_models"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_financial_results_period_id_fkey"
      columns: ["period_id"]
isOneToOne: false
      referencedRelation: "gos_financial_periods"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_master_forms": {
                  Row: {
                    "code": string,"created_at": string,"description": string | null,"functional_area": string | null,"id": string,"name": string,"status": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"description"?: string | null,"functional_area"?: string | null,"id"?: string,"name": string,"status"?: string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"description"?: string | null,"functional_area"?: string | null,"id"?: string,"name"?: string,"status"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"gos_master_questions": {
                  Row: {
                    "conditional_logic": Json | null,"created_at": string,"id": string,"is_required": boolean,"master_form_id": string,"options": Json | null,"question_text": string,"question_type": string,"section_name": string,"sort_order": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "conditional_logic"?: Json | null,"created_at"?: string,"id"?: string,"is_required"?: boolean,"master_form_id": string,"options"?: Json | null,"question_text": string,"question_type": string,"section_name": string,"sort_order"?: number | null
                  }
                  Update: {
                    "conditional_logic"?: Json | null,"created_at"?: string,"id"?: string,"is_required"?: boolean,"master_form_id"?: string,"options"?: Json | null,"question_text"?: string,"question_type"?: string,"section_name"?: string,"sort_order"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_master_questions_master_form_id_fkey"
      columns: ["master_form_id"]
isOneToOne: false
      referencedRelation: "gos_master_forms"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_offer_versions": {
                  Row: {
                    "created_at": string,"id": string,"offer_id": string,"snapshot_data": NonNullable<Json>,"version_number": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"offer_id": string,"snapshot_data": NonNullable<Json>,"version_number": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"offer_id"?: string,"snapshot_data"?: NonNullable<Json>,"version_number"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_offer_versions_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "gos_engagement_offers"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_profiles": {
                  Row: {
                    "created_at": string,"email": string,"first_name": string | null,"id": string,"last_name": string | null,"role": Database["public"]['Enums']["gos_role"],"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"first_name"?: string | null,"id": string,"last_name"?: string | null,"role"?: Database["public"]['Enums']["gos_role"],"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"first_name"?: string | null,"id"?: string,"last_name"?: string | null,"role"?: Database["public"]['Enums']["gos_role"],"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"gos_progetti": {
                  Row: {
                    "company_id": string,"created_at": string,"end_date": string | null,"engagement_id": string | null,"id": string,"name": string,"owner_id": string | null,"start_date": string | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"end_date"?: string | null,"engagement_id"?: string | null,"id"?: string,"name": string,"owner_id"?: string | null,"start_date"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"end_date"?: string | null,"engagement_id"?: string | null,"id"?: string,"name"?: string,"owner_id"?: string | null,"start_date"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_progetti_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "gos_aziende"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_progetti_engagement_id_fkey"
      columns: ["engagement_id"]
isOneToOne: false
      referencedRelation: "gos_engagements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_progetti_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "gos_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_project_assignments": {
                  Row: {
                    "created_at": string,"id": string,"project_id": string,"role_type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"project_id": string,"role_type"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"project_id"?: string,"role_type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_project_assignments_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "gos_progetti"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_project_assignments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "gos_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_project_costs": {
                  Row: {
                    "amount": number,"cost_type": string,"created_at": string,"date": string,"description": string | null,"id": string,"project_id": string,"task_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number,"cost_type": string,"created_at"?: string,"date": string,"description"?: string | null,"id"?: string,"project_id": string,"task_id"?: string | null
                  }
                  Update: {
                    "amount"?: number,"cost_type"?: string,"created_at"?: string,"date"?: string,"description"?: string | null,"id"?: string,"project_id"?: string,"task_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_project_costs_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "gos_progetti"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_project_costs_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "gos_tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_questionnaire_questions_snapshot": {
                  Row: {
                    "id": string,"is_required": boolean,"master_question_id": string | null,"options": Json | null,"question_text": string,"question_type": string,"questionnaire_id": string,"section_name": string,"sort_order": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"is_required"?: boolean,"master_question_id"?: string | null,"options"?: Json | null,"question_text": string,"question_type": string,"questionnaire_id": string,"section_name": string,"sort_order"?: number | null
                  }
                  Update: {
                    "id"?: string,"is_required"?: boolean,"master_question_id"?: string | null,"options"?: Json | null,"question_text"?: string,"question_type"?: string,"questionnaire_id"?: string,"section_name"?: string,"sort_order"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_questionnaire_questions_snapshot_master_question_id_fkey"
      columns: ["master_question_id"]
isOneToOne: false
      referencedRelation: "gos_master_questions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_questionnaire_questions_snapshot_questionnaire_id_fkey"
      columns: ["questionnaire_id"]
isOneToOne: false
      referencedRelation: "gos_questionnaires"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_questionnaires": {
                  Row: {
                    "created_at": string,"deadline": string | null,"id": string,"project_id": string,"status": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deadline"?: string | null,"id"?: string,"project_id": string,"status"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"deadline"?: string | null,"id"?: string,"project_id"?: string,"status"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_questionnaires_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "gos_progetti"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_raci_assignments": {
                  Row: {
                    "created_at": string,"id": string,"raci_role": string,"task_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"raci_role": string,"task_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"raci_role"?: string,"task_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_raci_assignments_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "gos_tasks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_raci_assignments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "gos_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_revenue_forecasts": {
                  Row: {
                    "adjustments": number,"id": string,"net_revenue": number,"period_id": string,"quantity": number,"revenue_line_id": string,"unit_discount": number,"unit_price": number
                  }
                  ComputedFields: never
                  Insert: {
                    "adjustments"?: number,"id"?: string,"net_revenue"?: number,"period_id": string,"quantity"?: number,"revenue_line_id": string,"unit_discount"?: number,"unit_price"?: number
                  }
                  Update: {
                    "adjustments"?: number,"id"?: string,"net_revenue"?: number,"period_id"?: string,"quantity"?: number,"revenue_line_id"?: string,"unit_discount"?: number,"unit_price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_revenue_forecasts_period_id_fkey"
      columns: ["period_id"]
isOneToOne: false
      referencedRelation: "gos_financial_periods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_revenue_forecasts_revenue_line_id_fkey"
      columns: ["revenue_line_id"]
isOneToOne: false
      referencedRelation: "gos_revenue_lines"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_revenue_lines": {
                  Row: {
                    "code": string,"created_at": string,"description": string | null,"financial_model_id": string,"id": string,"is_active": boolean,"name": string,"revenue_type": string,"sort_order": number | null,"unit_name": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"description"?: string | null,"financial_model_id": string,"id"?: string,"is_active"?: boolean,"name": string,"revenue_type"?: string,"sort_order"?: number | null,"unit_name"?: string | null
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"description"?: string | null,"financial_model_id"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"revenue_type"?: string,"sort_order"?: number | null,"unit_name"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_revenue_lines_financial_model_id_fkey"
      columns: ["financial_model_id"]
isOneToOne: false
      referencedRelation: "gos_financial_models"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_risposte_clienti": {
                  Row: {
                    "answer_value": string | null,"created_at": string,"file_url": string | null,"id": string,"questionnaire_id": string,"snapshot_question_id": string,"submitted_by": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer_value"?: string | null,"created_at"?: string,"file_url"?: string | null,"id"?: string,"questionnaire_id": string,"snapshot_question_id": string,"submitted_by"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "answer_value"?: string | null,"created_at"?: string,"file_url"?: string | null,"id"?: string,"questionnaire_id"?: string,"snapshot_question_id"?: string,"submitted_by"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_risposte_clienti_questionnaire_id_fkey"
      columns: ["questionnaire_id"]
isOneToOne: false
      referencedRelation: "gos_questionnaires"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_risposte_clienti_snapshot_question_id_fkey"
      columns: ["snapshot_question_id"]
isOneToOne: false
      referencedRelation: "gos_questionnaire_questions_snapshot"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_task_dependencies": {
                  Row: {
                    "dependency_type": string,"id": string,"predecessor_id": string,"task_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "dependency_type"?: string,"id"?: string,"predecessor_id": string,"task_id": string
                  }
                  Update: {
                    "dependency_type"?: string,"id"?: string,"predecessor_id"?: string,"task_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_task_dependencies_predecessor_id_fkey"
      columns: ["predecessor_id"]
isOneToOne: false
      referencedRelation: "gos_tasks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_task_dependencies_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "gos_tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_tasks": {
                  Row: {
                    "actual_cost": number | null,"actual_hours": number | null,"assigned_to": string | null,"created_at": string,"deliverable": string | null,"description": string | null,"duration": number | null,"end_date": string | null,"hourly_rate": number | null,"id": string,"parent_task_id": string | null,"planned_budget": number | null,"planned_hours": number | null,"priority": string,"progress": number | null,"project_id": string,"start_date": string | null,"status": string,"task_name": string,"updated_at": string,"wbs_code": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actual_cost"?: number | null,"actual_hours"?: number | null,"assigned_to"?: string | null,"created_at"?: string,"deliverable"?: string | null,"description"?: string | null,"duration"?: number | null,"end_date"?: string | null,"hourly_rate"?: number | null,"id"?: string,"parent_task_id"?: string | null,"planned_budget"?: number | null,"planned_hours"?: number | null,"priority"?: string,"progress"?: number | null,"project_id": string,"start_date"?: string | null,"status"?: string,"task_name": string,"updated_at"?: string,"wbs_code": string
                  }
                  Update: {
                    "actual_cost"?: number | null,"actual_hours"?: number | null,"assigned_to"?: string | null,"created_at"?: string,"deliverable"?: string | null,"description"?: string | null,"duration"?: number | null,"end_date"?: string | null,"hourly_rate"?: number | null,"id"?: string,"parent_task_id"?: string | null,"planned_budget"?: number | null,"planned_hours"?: number | null,"priority"?: string,"progress"?: number | null,"project_id"?: string,"start_date"?: string | null,"status"?: string,"task_name"?: string,"updated_at"?: string,"wbs_code"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_tasks_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "gos_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_tasks_parent_task_id_fkey"
      columns: ["parent_task_id"]
isOneToOne: false
      referencedRelation: "gos_tasks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_tasks_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "gos_progetti"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_time_entries": {
                  Row: {
                    "cost_associated": number | null,"created_at": string,"date": string,"description": string | null,"hours": number,"id": string,"task_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cost_associated"?: number | null,"created_at"?: string,"date": string,"description"?: string | null,"hours"?: number,"id"?: string,"task_id": string,"user_id": string
                  }
                  Update: {
                    "cost_associated"?: number | null,"created_at"?: string,"date"?: string,"description"?: string | null,"hours"?: number,"id"?: string,"task_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_time_entries_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "gos_tasks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gos_time_entries_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "gos_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"gos_working_capital_params": {
                  Row: {
                    "dio_days": number,"dpo_days": number,"dso_days": number,"financial_model_id": string,"id": string,"tax_rate": number
                  }
                  ComputedFields: never
                  Insert: {
                    "dio_days"?: number,"dpo_days"?: number,"dso_days"?: number,"financial_model_id": string,"id"?: string,"tax_rate"?: number
                  }
                  Update: {
                    "dio_days"?: number,"dpo_days"?: number,"dso_days"?: number,"financial_model_id"?: string,"id"?: string,"tax_rate"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "gos_working_capital_params_financial_model_id_fkey"
      columns: ["financial_model_id"]
isOneToOne: false
      referencedRelation: "gos_financial_models"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "gos_company_status": "active"|"prospect"|"client"|"inactive","gos_role": "administrator"|"advisor"|"collaborator"|"client"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "gos_company_status": ["active", "prospect", "client", "inactive"],"gos_role": ["administrator", "advisor", "collaborator", "client"]
          }
        }
} as const
