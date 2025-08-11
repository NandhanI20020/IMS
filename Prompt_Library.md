# IMS Project Prompt Library

This document contains all the prompts used during the development of the Supabase-based Inventory Management System (IMS) project.

## Project Context

```
CONTEXT: Building an e-commerce inventory management system using Supabase as the backend. Lets do it step by step based on my prompts.
```

## Task 1: Complete Supabase Project Setup

```
TASK: Create complete Supabase project setup with PostgreSQL schema:

SUPABASE CONFIGURATION:
1. Database schema for inventory management with proper relationships
2. Row Level Security (RLS) policies for multi-tenant access
3. Authentication setup with user roles (admin, manager, user)
4. Real-time subscriptions configuration
5. Storage bucket setup for product images

SCHEMA REQUIREMENTS:
- Users table extending Supabase auth.users
- Products with categories, suppliers, and pricing
- Multi-warehouse inventory tracking
- Purchase orders with line items and workflow states
- Stock movements for audit trails
- Automated stock alerts system

RLS POLICIES:
- Warehouse-based access control
- Role-based data visibility
- Secure audit trail protection
- User-specific data access

REAL-TIME FEATURES:
- Inventory level change subscriptions
- Purchase order status updates
- Stock alert broadcasting
- Multi-user collaboration

OUTPUT FORMAT: Complete SQL schema file with RLS policies and Supabase-specific configurations
```

---

## Project Implementation Summary

This project successfully created a comprehensive e-commerce inventory management system using Supabase as the backend, featuring:

### Core Components Implemented
- **Database Schema**: Complete PostgreSQL schema with proper relationships and constraints
- **Authentication System**: Extended Supabase auth.users with role-based user profiles
- **Multi-warehouse Support**: Full inventory tracking across multiple warehouse locations
- **Purchase Order System**: Complete workflow from draft to received status
- **Audit Trail**: Immutable stock movement tracking for compliance
- **Alert System**: Automated low stock and out-of-stock notifications

### Security Features
- **Row Level Security (RLS)**: Comprehensive policies for data isolation
- **Role-based Access**: Admin, manager, and user permission levels
- **Warehouse-based Access**: Users can only access their assigned warehouse data
- **Audit Protection**: Stock movements are protected from unauthorized changes

### Real-time Capabilities
- **Live Inventory Updates**: Real-time stock level synchronization
- **Purchase Order Tracking**: Instant status updates across clients
- **Stock Alerts**: Immediate notifications for inventory issues
- **Multi-user Collaboration**: Synchronized data updates for team collaboration

### Storage & Media
- **Product Images**: Secure storage bucket with proper access policies
- **File Management**: Upload restrictions and MIME type validation

### Developer Experience
- **Complete Documentation**: Step-by-step deployment instructions
- **Utility Functions**: Helper functions for common operations
- **Sample Data**: Ready-to-use seed data for development testing
- **Client Examples**: Real-time subscription implementation examples

The system is production-ready with comprehensive security, real-time features, and complete documentation for deployment and usage.