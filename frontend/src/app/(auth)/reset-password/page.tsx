import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  return (
    <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center tracking-tight">
          Reset Password
        </CardTitle>
        <CardDescription className="text-center">
          Enter a new password for your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input id="password" type="password" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm Password</Label>
            <Input id="confirm_password" type="password" required />
          </div>
          <Button className="w-full" type="button">Reset Password</Button>
          <div className="text-center text-sm">
            <a href="/login" className="text-primary hover:underline">Back to login</a>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
