import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { User, Mail, Calendar, Shield } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U';
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
  
  const platformAdminEmails = ["graham@tenexity.ai", "admin@tenexity.ai"];
  const isPlatformAdmin = user.email && platformAdminEmails.some(
    adminEmail => adminEmail.toLowerCase() === (user.email || "").toLowerCase().trim()
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" data-testid="text-profile-title">My Profile</h1>
        <p className="text-muted-foreground mt-2">View and manage your account information</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-profile-info">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>Your personal details and account status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 mb-6">
              <Avatar className="h-20 w-20">
                {user.profileImageUrl && (
                  <AvatarImage src={user.profileImageUrl} alt={fullName} />
                )}
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-semibold" data-testid="text-user-name">{fullName}</h2>
                <div className="flex items-center gap-2 mt-2">
                  {isPlatformAdmin && (
                    <Badge variant="default" className="bg-blue-600">
                      <Shield className="h-3 w-3 mr-1" />
                      Platform Admin
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email Address</p>
                  <p className="font-medium" data-testid="text-user-email">{user.email || 'Not set'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">First Name</p>
                  <p className="font-medium">{user.firstName || 'Not set'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Last Name</p>
                  <p className="font-medium">{user.lastName || 'Not set'}</p>
                </div>
              </div>

              {user.createdAt && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Account Created</p>
                    <p className="font-medium">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-account-status">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Status
            </CardTitle>
            <CardDescription>Your access level and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Role</h3>
                <p className="text-muted-foreground text-sm">
                  {isPlatformAdmin ? (
                    <span className="text-blue-600 font-medium">Platform Administrator</span>
                  ) : (
                    <span>Standard User</span>
                  )}
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Access</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Dashboard and Analytics</li>
                  <li>Account Management</li>
                  <li>ICP Builder</li>
                  <li>Playbooks and Tasks</li>
                  <li>Revenue Tracking</li>
                  {isPlatformAdmin && (
                    <>
                      <li className="text-blue-600 font-medium">Platform Administration</li>
                      <li className="text-blue-600 font-medium">Tenant Management</li>
                      <li className="text-blue-600 font-medium">Stripe Configuration</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
