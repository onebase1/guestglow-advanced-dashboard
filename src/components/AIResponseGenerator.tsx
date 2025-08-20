import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, Sparkles, MessageSquare } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface AIResponseGeneratorProps {
  reviewText: string
  rating: number
  isExternal?: boolean
  platform?: string
  guestName?: string
  onResponseGenerated?: (response: string) => void
}

export function AIResponseGenerator({ 
  reviewText, 
  rating, 
  isExternal = false, 
  platform, 
  guestName,
  onResponseGenerated
}: AIResponseGeneratorProps) {
  const [generatedResponse, setGeneratedResponse] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const generateResponse = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('ai-response-generator', {
        body: {
          reviewText,
          rating,
          isExternal,
          platform,
          guestName
        }
      })
      
      if (error) throw error
      
      setGeneratedResponse(data.response)
      onResponseGenerated?.(data.response)
      
      toast({
        title: "Response Generated",
        description: `AI-powered ${data.type} ready for review`
      })
    } catch (error) {
      // Response generation failed
      toast({
        title: "Error generating response",
        variant: "destructive"
      })
    }
    setLoading(false)
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedResponse)
    toast({
      title: "Copied to clipboard",
      description: "Response copied successfully"
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">AI Response Assistant</CardTitle>
          </div>
          <Badge variant={isExternal ? "destructive" : "secondary"}>
            {isExternal ? "Public Response" : "Internal Response"}
          </Badge>
        </div>
        <CardDescription>
          Generate professional responses to guest feedback using AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Original Review:</p>
          <p className="text-sm">{reviewText}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{rating}/5 stars</Badge>
            {platform && <Badge variant="outline">{platform}</Badge>}
            {guestName && <Badge variant="outline">{guestName}</Badge>}
          </div>
        </div>

        <Button 
          onClick={generateResponse} 
          disabled={loading}
          className="w-full"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {loading ? "Generating Response..." : "Generate AI Response"}
        </Button>

        {generatedResponse && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Generated Response:</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            <Textarea
              value={generatedResponse}
              onChange={(e) => setGeneratedResponse(e.target.value)}
              rows={6}
              className="resize-none"
              placeholder="AI-generated response will appear here..."
            />
            <p className="text-xs text-muted-foreground">
              You can edit the generated response before using it. AI-generated content should always be reviewed.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}