<script setup lang="ts">
const props = defineProps<{
    label: string
}>()

const emit = defineEmits<{
    click: []
}>()

const handleClick = () => {
    emit("click")
}
</script>

<template>
    <button
        type="button"
        class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        @click="handleClick"
    >
        {{ props.label }}
    </button>
</template>
