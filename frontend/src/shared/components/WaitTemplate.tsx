import { Text } from "reshaped";

type WaitTemplateProps = {
    template: string;
};

export function WaitTemplate({ template }: WaitTemplateProps) {
    return (
        <Text>
            {`The ${template} template is not yet implemented. Please wait for future updates.`}
        </Text>
    )
}