import { AlertCircle } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h1 className="font-serif text-3xl font-medium tracking-tight">404</h1>
      <p className="text-muted-foreground max-w-md mx-auto">
        The page you're looking for couldn't be found.
      </p>
    </div>
  )
}