<script lang="ts">
    import { Select as SelectPrimitive } from 'bits-ui'

    let { ...restProps }: SelectPrimitive.GroupProps = $props()
</script>

<SelectPrimitive.Group data-slot="select-group" {...restProps} />
