<script setup>
defineProps({ settings: { type: Object, required: true } });
const emit = defineEmits(['change']);
const fields = [
  { id: 'level', label: '选择小关卡', options: [[1, '第 1 关 · 认识 Do Re Mi'], [2, '第 2 关 · 五个好朋友'], [3, '第 3 关 · 完整七个音'], [4, '第 4 关 · 高音扩展']] },
  { id: 'hands', label: '小手合作方式', options: [['solo', '右手 · 单音热身'], ['duet', '双手 · 两个音一起找'], ['chord', '双手和弦 · 一组四个音']] },
  { id: 'inputStyle', label: '弹奏方式', options: [['collect', '逐个找到 · 入门'], ['together', '同时按住 · 双手配合']] },
  { id: 'accidentals', label: '升降号练习', options: [['natural', '自然音 · 无升降号'], ['sharp', '升号 ♯ · 升半音'], ['flat', '降号 ♭ · 降半音'], ['mixed', '升降混合 ♯ ♭']] },
];
</script>

<template>
  <aside class="panel settings" aria-label="练习设置">
    <div class="section-title">我的音乐冒险 <span>✦</span></div>
    <div v-for="field in fields" :key="field.id" class="setting-field">
      <label :for="field.id">{{ field.label }}</label>
      <select :id="field.id" :value="settings[field.id]" @change="emit('change', field.id, field.id === 'level' ? Number($event.target.value) : $event.target.value)">
        <option v-for="[value, label] in field.options" :key="value" :value="value">{{ label }}</option>
      </select>
    </div>
    <div class="setting-field play-field">
      <label>选择玩法</label>
      <div class="modes" role="group" aria-label="选择玩法">
        <button v-for="[value, label] in [['practice', '☀ 自由练习'], ['challenge', '◷ 60 秒挑战']]" :key="value" :data-mode="value" :class="{ selected: settings.mode === value }" :aria-pressed="settings.mode === value" @click="emit('change', 'mode', value)">{{ label }}</button>
      </div>
    </div>
  </aside>
</template>
