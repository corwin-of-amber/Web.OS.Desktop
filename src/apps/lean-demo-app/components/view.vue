<template>
  <div class="table-container" ref="tableContainer">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Payload
            <div class="minibar">
              <button @click="minibarAction('poke')">poke</button>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td class="col--id">{{ item.id }}</td>
          <td class="col--payload">{{ payload(item) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Ref, toNative } from 'vue-facing-decorator';

@Component({emits: ['toolbar-action']})
class IView extends Vue {
    items: {id?: number}[] = []

    @Ref tableContainer: HTMLDivElement

    push(msg: any) {
        this.items.push(msg);
        setTimeout(() => this.tableContainer.scrollBy(0, 999), 10);
    }

    payload(msg: object) {
        return JSON.stringify(msg, null, 1);
    }

    minibarAction(type: string) {
      this.$emit('toolbar-action', {type});
    }
}

export { IView }
export default toNative(IView)
</script>

<style scoped>
.table-container {
    overflow: auto;
    height: 100%;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  border: 1px solid #ccc;
  padding: 8px;
  text-align: left;
}
td.col--payload {
  word-break: break-word;
}
thead {
  background: #f5f5f5;
  position: sticky;
  top: 0;
}
thead th {
  border-top: none;
}
div.minibar {
  float: right;
  margin-top: -3px;
  margin-bottom: -1em;
}
</style>
