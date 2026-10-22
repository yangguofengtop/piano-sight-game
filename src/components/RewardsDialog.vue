<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import { gifts } from '../composables/usePianoGame.js';
const props = defineProps({ state: { type: Object, required: true } });
const emit = defineEmits(['close']);
const dialog = ref(null);
watch(() => props.state.rewardOpen, open => {
  if (open && !dialog.value?.open) dialog.value?.showModal();
  if (!open && dialog.value?.open) dialog.value.close();
}, { flush: 'post' });
onBeforeUnmount(() => dialog.value?.close());
</script>

<template>
  <dialog id="reward-dialog" ref="dialog" @close="emit('close')">
    <button class="dialog-close" aria-label="关闭宝藏" @click="emit('close')">×</button>
    <span class="eyebrow">音符森林的礼物</span><h2>{{ state.rewardTitle }}</h2><p>{{ state.rewardDescription }}</p>
    <div id="treasures"><div v-for="gift in gifts" :key="gift.at" class="treasure" :class="{ earned: state.lifetimeStars >= gift.at }"><span>{{ gift.icon }}</span><b>{{ gift.name }}</b><small>{{ state.lifetimeStars >= gift.at ? '已收藏' : `累计 ${gift.at} 颗星` }}</small></div></div>
    <p class="save-note">累计收集 {{ state.lifetimeStars }} 颗星星 · {{ state.storageAvailable ? '已自动保存在当前浏览器' : '当前浏览器无法保存，关闭后将重置' }}</p>
    <button class="continue-button" @click="emit('close')">继续音乐冒险 →</button>
  </dialog>
</template>
