import { Button, Card, Text, TextField, View } from "reshaped";

export function LoginForm() {
  return (
    <Card padding={8}>
      <View gap={6}>
        <View align="center" gap={2}>
          <div className="auth-logo">K</div>

          <Text variant="featured-3" weight="bold">
            Kanban App
          </Text>

          <Text color="neutral-faded">Organize. Prioritize. Deliver.</Text>
        </View>

        <View gap={4}>
          <TextField name="email" placeholder="sarah.m@design.com" />

          <TextField name="password" placeholder="Enter your password" />

          <View align="end">
            <Button
              variant="ghost"
              color="primary"
              size="small"
              onClick={() => {}}
            >
              Forgot password?
            </Button>
          </View>
        </View>

        <Button color="primary" size="large" fullWidth onClick={() => {}}>
          Log in
        </Button>

        <View direction="row" align="center" gap={3}>
          <View.Item grow>
            <div className="auth-divider" />
          </View.Item>

          <Text variant="caption-1" color="neutral-faded">
            OR
          </Text>

          <View.Item grow>
            <div className="auth-divider" />
          </View.Item>
        </View>

        <Button
          variant="outline"
          color="neutral"
          size="large"
          fullWidth
          onClick={() => {}}
        >
          Create an account
        </Button>
      </View>
    </Card>
  );
}
