import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  return (
    <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center tracking-tight">
          Forgot Password
        </CardTitle>
        <CardDescription className="text-center">
          Enter your email address and we'll send you a recovery link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" placeholder="name@intersmart.in" required />
          </div>
          <Button className="w-full" type="button">Send Recovery Email</Button>
          <div className="text-center text-sm">
            <a href="/login" className="text-primary hover:underline">Back to login</a>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
