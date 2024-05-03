import { Button } from "./button";
import { Card, CardContent } from "./card";
import { Spinner } from "./spinner";

export function LoadingPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center min-h-40">
      <Spinner className="w-8 h-8" />
    </div>
  );
}

export function LoadingButton() {
  return (
    <Button
      disabled={true}
      variant="outline"
      className="w-full flex items-center justify-center"
    >
      <Spinner className="w-4 h-4" />
    </Button>
  );
}

export function LoadingPlaceholderCard({
  children
}: {
  children?: React.ReactNode | React.ReactNode[] | null;
}) {
  return (
    <Card>
      <CardContent>
        <div className="w-full h-full flex items-center justify-center pt-12">
          <Spinner className="w-8 h-8" />
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
