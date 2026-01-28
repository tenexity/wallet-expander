# Platform Administrator Guide

## Overview

The Wallet Share Expander platform includes a dedicated App Admin panel for platform administrators (Tenexity team members) to manage all client tenants and their subscriptions.

## Accessing the App Admin Panel

### Requirements

Only users with platform administrator privileges can access the App Admin panel. Platform administrators are identified by their email address:

- graham@tenexity.ai
- admin@tenexity.ai

### Navigation

1. Log in to the application with a platform administrator email
2. Look for "App Admin" in the Admin section of the sidebar navigation
3. Click "App Admin" to access the tenant management panel

**Note:** If you don't see "App Admin" in the sidebar, your email is not in the platform administrator whitelist.

## App Admin Features

### Tenant Overview

The main dashboard displays all registered tenants with the following information:

| Column | Description |
|--------|-------------|
| Tenant | Company/organization name |
| Status | Subscription status (active, trial, expired, cancelled) |
| Plan | Current subscription tier (Free, Starter, Growth, Scale) |
| Accounts | Number of accounts in the tenant's database |
| Playbooks | Number of playbooks created |
| ICPs | Number of Ideal Customer Profiles defined |
| Enrolled | Number of accounts enrolled in the program |
| Actions | Edit subscription button |

### Managing Tenant Subscriptions

To update a tenant's subscription:

1. Click the "Edit" button (pencil icon) next to the tenant
2. In the dialog, you can modify:
   - **Status**: Change between active, trial, expired, or cancelled
   - **Plan Type**: Upgrade or downgrade the tenant's tier
3. Click "Save Changes" to apply the updates

### Subscription Plans and Feature Limits

Each plan tier includes specific feature limits:

| Feature | Free | Starter | Growth | Scale |
|---------|------|---------|--------|-------|
| Accounts | 10 | 50 | Unlimited | Unlimited |
| Enrolled Accounts | 1 | 1 | 5 | Unlimited |
| Playbooks | 1 | 1 | Unlimited | Unlimited |
| ICPs | 1 | 1 | 3 | Unlimited |

When tenants exceed their limits, they receive an upgrade prompt encouraging them to move to a higher tier.

## Subscription Status Definitions

- **Active**: Tenant has a valid, paid subscription
- **Trial**: Tenant is in a trial period
- **Expired**: Subscription has lapsed and needs renewal
- **Cancelled**: Tenant has cancelled their subscription

## Best Practices

1. **Monitor Usage**: Regularly review tenant usage metrics to identify accounts that may benefit from tier upgrades
2. **Proactive Outreach**: Contact tenants approaching their limits to discuss upgrade options
3. **Status Management**: Keep subscription statuses current to ensure accurate feature access

## Troubleshooting

### Can't Access App Admin

- Verify your login email is in the platform administrator whitelist
- Clear browser cache and log in again
- Contact the development team to add your email to the whitelist

### Changes Not Saving

- Check your network connection
- Verify the tenant ID is valid
- Review browser console for error messages

## Security Notes

- App Admin access is restricted at both the UI level (sidebar visibility) and API level (endpoint protection)
- All API requests to /api/app-admin/* endpoints require platform administrator authentication
- Non-admin users attempting to access these endpoints will receive a 403 Forbidden error
