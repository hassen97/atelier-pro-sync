import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, ArrowLeft, MessageCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ResetPassword() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-4">
            <Wrench className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Mot de passe oublié</h1>
          <p className="text-muted-foreground mt-1">Récupération de compte</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Contactez l'administrateur
            </CardTitle>
            <CardDescription>
              Pour réinitialiser votre mot de passe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-primary/30 bg-primary/5">
              <AlertDescription className="text-sm">
                Comme votre compte utilise un nom d'utilisateur (sans email), la réinitialisation 
                du mot de passe doit être effectuée par un administrateur.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Pour récupérer votre compte, veuillez :</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Contacter l'administrateur de la plateforme</li>
                <li>Fournir votre <strong className="text-foreground">nom d'utilisateur</strong></li>
                <li>L'administrateur réinitialisera votre mot de passe</li>
                <li>Vous pourrez ensuite vous connecter et changer votre mot de passe dans les paramètres</li>
              </ol>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/auth")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          © 2024 RepairPro Tunisie. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
