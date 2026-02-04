# 🚀 Escalabilidade e Load Balancing para 5K+ Usuários

**Versão:** 1.0  
**Capacidade:** Suporta até 50K+ usuários simultâneos  
**Tecnologia:** Kubernetes + Docker + Redis + MongoDB Replication  
**Ambiente:** Produção (vendata.com.br)

---

## 📊 Arquitetura de Escalabilidade

### Camadas

```
┌────────────────────────────────────────────────────┐
│                    CDN / Load Balancer              │
│                   (Cloudflare / AWS)                │
│                                                     │
│              vendata.com.br (DNS)                   │
└─────────────────────┬────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
    ┌─────────┐   ┌─────────┐   ┌─────────┐
    │  Nginx  │   │  Nginx  │   │  Nginx  │
    │  LB     │   │  LB     │   │  LB     │
    │ (K8s)   │   │ (K8s)   │   │ (K8s)   │
    └────┬────┘   └────┬────┘   └────┬────┘
         │             │             │
    ┌────┴────┬────────┴────┬────────┴────┐
    ▼         ▼             ▼             ▼
┌───────┐┌───────┐┌───────┐┌───────┐
│ API   ││ API   ││ API   ││ API   │  (10-50 replicas)
│Pod 1  ││Pod 2  ││Pod 3  ││Pod N  │
└───┬───┘└───┬───┘└───┬───┘└───┬───┘
    │        │        │        │
    └────────┴────────┼────────┘
                      ▼
            ┌──────────────────────┐
            │   Redis Cluster      │
            │  (Session Store)     │
            │  3+ nodes, HA        │
            └────────┬─────────────┘
                     │
            ┌────────┴──────────┐
            ▼                   ▼
      ┌──────────────┐  ┌──────────────┐
      │   MongoDB    │  │   MongoDB    │
      │   Primary    │  │  Secondary   │
      │   (write)    │  │   (read)     │
      └──────────────┘  └──────────────┘
            ▲                   ▲
            └───────────────────┘
           (Replication)
```

---

## 🎯 Estratégia de Escalabilidade

### Fase 1: 100-500 usuários

```
✅ Docker Compose (atual)
✅ 1 API server
✅ 1 MongoDB
✅ 1 Redis
✅ 1 Nginx
Capacidade: ~500 requisições/segundo
```

### Fase 2: 500-2K usuários

```
🔄 Transição para Kubernetes
✅ 3 API replicas
✅ 3 Nginx replicas
✅ MongoDB com replicação
✅ Redis Sentinel
✅ Load Balancer externo
Capacidade: ~5K requisições/segundo
```

### Fase 3: 2K-5K usuarios

```
⚡ Kubernetes completo
✅ 10-20 API replicas (auto-scaling)
✅ 5 Nginx replicas
✅ MongoDB Replica Set (3 nodes)
✅ Redis Cluster (6 nodes)
✅ CDN (Cloudflare)
✅ Database Read Replicas
Capacidade: ~20K requisições/segundo
```

### Fase 4: 5K+ usuários

```
🚀 Multi-região
✅ 50+ API replicas
✅ Sharding do MongoDB
✅ Redis em múltiplas regiões
✅ CDN global
✅ Replicação geográfica
Capacidade: ~100K+ requisições/segundo
```

---

## 🐳 Docker Compose → Kubernetes

### Porque Kubernetes para 5K+ usuários?

| Aspecto           | Docker Compose         | Kubernetes   |
| ----------------- | ---------------------- | ------------ |
| **Replicas**      | Manual                 | Automático   |
| **Auto-scaling**  | ❌                     | ✅           |
| **Balanceamento** | Básico                 | Avançado     |
| **Health checks** | Simples                | Completo     |
| **Atualizações**  | Zero-downtime possível | Garantido    |
| **Persistência**  | Volumes                | StatefulSets |
| **Networking**    | Container networks     | Service mesh |
| **Monitoramento** | Básico                 | Integrado    |

---

## 🐋 Kubernetes - Começar Agora

### 1️⃣ Criar Namespace

```bash
kubectl create namespace vendata
kubectl set context --current --namespace=vendata
```

### 2️⃣ ConfigMap para variáveis

```bash
kubectl create configmap api-config \
  --from-literal=NODE_ENV=production \
  --from-literal=API_URL=https://api.vendata.com.br \
  --from-literal=FRONTEND_URL=https://vendata.com.br
```

### 3️⃣ Secrets para senhas

```bash
kubectl create secret generic api-secrets \
  --from-literal=JWT_SECRET=$(openssl rand -base64 64) \
  --from-literal=MONGODB_PASSWORD=$(openssl rand -base64 32) \
  --from-literal=REDIS_PASSWORD=$(openssl rand -base64 32) \
  --from-literal=ADMIN_TOKEN=$(openssl rand -base64 32)
```

---

## 📄 Kubernetes Manifests

### Deployment da API (k8s-api-deployment.yaml)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-deployment
  namespace: vendata
  labels:
    app: api
    version: v1
spec:
  replicas: 10 # Começar com 10, aumentar conforme necessário
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 0 # Zero-downtime deployment
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
        version: v1
    spec:
      affinity:
        # Distribuir pods em diferentes nodes
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - api
                topologyKey: kubernetes.io/hostname

      containers:
        - name: api
          image: seu-registry/projeto-sass-api:latest
          imagePullPolicy: Always

          ports:
            - name: http
              containerPort: 3011
              protocol: TCP

          env:
            - name: NODE_ENV
              valueFrom:
                configMapKeyRef:
                  name: api-config
                  key: NODE_ENV
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: api-secrets
                  key: JWT_SECRET
            - name: MONGODB_URI
              value: mongodb://mongo-0.mongo-service,mongo-1.mongo-service,mongo-2.mongo-service:27017/vendata_prod?replicaSet=rs0
            - name: REDIS_URL
              value: redis://redis-service:6379/0

          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1024Mi

          livenessProbe:
            httpGet:
              path: /api/health
              port: 3011
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3

          readinessProbe:
            httpGet:
              path: /api/health
              port: 3011
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 2

          volumeMounts:
            - name: logs
              mountPath: /app/logs

      volumes:
        - name: logs
          emptyDir: {}

---
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: vendata
spec:
  type: ClusterIP
  selector:
    app: api
  ports:
    - port: 3011
      targetPort: 3011
      protocol: TCP
```

### StatefulSet para MongoDB (k8s-mongodb-statefulset.yaml)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mongodb-config
  namespace: vendata
data:
  init-replica-set.sh: |
    #!/bin/bash
    if [ "$HOSTNAME" = "mongo-0" ]; then
      mongosh --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'mongo-0.mongo-service:27017'}, {_id: 1, host: 'mongo-1.mongo-service:27017'}, {_id: 2, host: 'mongo-2.mongo-service:27017'}]})"
    fi

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongo
  namespace: vendata
spec:
  serviceName: mongo-service
  replicas: 3 # Replica Set com 3 nodes
  selector:
    matchLabels:
      app: mongo
  template:
    metadata:
      labels:
        app: mongo
    spec:
      containers:
        - name: mongodb
          image: mongo:7.0
          ports:
            - containerPort: 27017
              name: mongodb

          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              value: admin
            - name: MONGO_INITDB_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: api-secrets
                  key: MONGODB_PASSWORD
            - name: MONGO_INITDB_DATABASE
              value: vendata_prod

          command:
            - mongod
            - --replSet=rs0
            - --bind_ip=0.0.0.0
            - --auth

          resources:
            requests:
              cpu: 1000m
              memory: 2Gi
            limits:
              cpu: 2000m
              memory: 4Gi

          volumeMounts:
            - name: mongodb-data
              mountPath: /data/db
            - name: mongodb-config
              mountPath: /scripts

          livenessProbe:
            exec:
              command:
                - mongosh
                - --eval
                - "db.adminCommand('ping')"
            initialDelaySeconds: 30
            periodSeconds: 10

          readinessProbe:
            exec:
              command:
                - mongosh
                - --eval
                - "db.adminCommand('ping')"
            initialDelaySeconds: 5
            periodSeconds: 5

  volumeClaimTemplates:
    - metadata:
        name: mongodb-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: "standard"
        resources:
          requests:
            storage: 100Gi

---
apiVersion: v1
kind: Service
metadata:
  name: mongo-service
  namespace: vendata
spec:
  clusterIP: None # Headless service para StatefulSet
  selector:
    app: mongo
  ports:
    - port: 27017
      targetPort: 27017
```

### Horizontal Pod Autoscaler (k8s-hpa.yaml)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: vendata
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-deployment

  minReplicas: 5
  maxReplicas: 50 # Escalar até 50 replicas

  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80

  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 50
          periodSeconds: 15
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 5
          periodSeconds: 15
      selectPolicy: Max

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mongo-hpa
  namespace: vendata
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: mongo

  minReplicas: 3
  maxReplicas: 10

  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 80
```

---

## 📊 Load Balancing com Nginx

### Nginx como Load Balancer (em K8s)

```nginx
upstream api_backend {
    least_conn;

    # K8s descoberta automática via DNS
    server api-service.vendata.svc.cluster.local:3011 max_fails=3 fail_timeout=30s;

    keepalive 32;
}

upstream frontend_backend {
    server frontend-service.vendata.svc.cluster.local:5173;
    keepalive 32;
}

# Rate limiting por IP
limit_req_zone $binary_remote_addr zone=general:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=50r/s;

server {
    listen 443 ssl http2;
    server_name vendata.com.br www.vendata.com.br;

    # SSL configuration
    ssl_certificate /etc/nginx/ssl/vendata.com.br.crt;
    ssl_certificate_key /etc/nginx/ssl/vendata.com.br.key;

    # Connection pooling
    keepalive_timeout 65;
    keepalive_requests 100;

    # Buffer settings para high load
    client_body_buffer_size 128k;
    client_max_body_size 100m;
    proxy_buffer_size 4k;
    proxy_buffers 8 4k;
    proxy_busy_buffers_size 8k;

    location /api/ {
        limit_req zone=api burst=20 nodelay;

        proxy_pass http://api_backend;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts para produção
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;

        # Retry logic
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
        proxy_next_upstream_tries 2;
        proxy_next_upstream_timeout 10s;
    }

    location / {
        limit_req zone=general burst=50 nodelay;

        proxy_pass http://frontend_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

---

## 🔄 Redis Cluster para 5K+ usuários

### Redis Cluster Setup (k8s-redis-cluster.yaml)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-cluster-config
  namespace: vendata
data:
  redis.conf: |
    port 6379
    cluster-enabled yes
    cluster-config-file /data/nodes.conf
    cluster-node-timeout 5000
    appendonly yes
    appendfsync everysec
    maxmemory 2gb
    maxmemory-policy allkeys-lru

---
apiVersion: v1
kind: Service
metadata:
  name: redis-cluster-service
  namespace: vendata
spec:
  clusterIP: None
  ports:
    - port: 6379
      name: redis
    - port: 16379
      name: redis-gossip
  selector:
    app: redis-cluster

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
  namespace: vendata
spec:
  serviceName: redis-cluster-service
  replicas: 6 # 6 nodes (3 masters + 3 slaves)
  selector:
    matchLabels:
      app: redis-cluster
  template:
    metadata:
      labels:
        app: redis-cluster
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
              name: redis
            - containerPort: 16379
              name: gossip

          command:
            - redis-server
            - /etc/redis/redis.conf
            - --cluster-announce-ip=$(POD_IP)

          env:
            - name: POD_IP
              valueFrom:
                fieldRef:
                  fieldPath: status.podIP

          volumeMounts:
            - name: redis-data
              mountPath: /data
            - name: redis-config
              mountPath: /etc/redis

          resources:
            requests:
              cpu: 500m
              memory: 2Gi
            limits:
              cpu: 1000m
              memory: 4Gi

      volumes:
        - name: redis-config
          configMap:
            name: redis-cluster-config

  volumeClaimTemplates:
    - metadata:
        name: redis-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 50Gi
```

---

## 📈 Monitoramento e Métricas

### Prometheus + Grafana (k8s-monitoring.yaml)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: vendata
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s

    scrape_configs:
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
          - vendata
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__

    - job_name: 'kubernetes-nodes'
      kubernetes_sd_configs:
      - role: node
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: vendata
spec:
  replicas: 2
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
        - name: prometheus
          image: prom/prometheus:latest
          ports:
            - containerPort: 9090
          volumeMounts:
            - name: config
              mountPath: /etc/prometheus
            - name: data
              mountPath: /prometheus
      volumes:
        - name: config
          configMap:
            name: prometheus-config
        - name: data
          emptyDir: {}

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: vendata
spec:
  replicas: 2
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
        - name: grafana
          image: grafana/grafana:latest
          ports:
            - containerPort: 3000
          env:
            - name: GF_SECURITY_ADMIN_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: api-secrets
                  key: ADMIN_TOKEN
          volumeMounts:
            - name: data
              mountPath: /var/lib/grafana
      volumes:
        - name: data
          emptyDir: {}
```

---

## 🚀 Deploy no Kubernetes

### Passo 1: Instalar Kubernetes

```bash
# Opção 1: minikube (local)
minikube start --cpus=4 --memory=8192

# Opção 2: EKS (AWS)
eksctl create cluster --name vendata-cluster --region us-east-1

# Opção 3: GKE (Google Cloud)
gcloud container clusters create vendata-cluster --zone us-central1-a
```

### Passo 2: Aplicar Manifests

```bash
# Criar namespace
kubectl create namespace vendata

# Aplicar ConfigMaps e Secrets
kubectl apply -f k8s-config.yaml
kubectl apply -f k8s-secrets.yaml

# Deploy MongoDB (StatefulSet)
kubectl apply -f k8s-mongodb-statefulset.yaml

# Deploy Redis Cluster
kubectl apply -f k8s-redis-cluster.yaml

# Deploy API
kubectl apply -f k8s-api-deployment.yaml

# Aplicar HPA
kubectl apply -f k8s-hpa.yaml

# Deploy Monitoring
kubectl apply -f k8s-monitoring.yaml
```

### Passo 3: Verificar Status

```bash
# Ver pods
kubectl get pods -n vendata

# Ver services
kubectl get services -n vendata

# Ver deployments
kubectl get deployments -n vendata

# Ver HPA
kubectl get hpa -n vendata

# Ver logs da API
kubectl logs -f deployment/api-deployment -n vendata
```

---

## 💾 Backup e Disaster Recovery

### MongoDB Backup (automático)

```bash
# Usando Velero (K8s backup)
velero backup create vendata-backup --include-namespaces vendata

# Restaurar
velero restore create --from-backup vendata-backup
```

### Redis Backup

```bash
# No Pod
kubectl exec -it redis-cluster-0 -n vendata -- redis-cli BGSAVE
kubectl exec -it redis-cluster-0 -n vendata -- redis-cli LASTSAVE
```

---

## 📊 Performance Esperada

| Métrica             | Com Docker Compose | Com Kubernetes (3 nodes) | Com Kubernetes (10+ nodes) |
| ------------------- | ------------------ | ------------------------ | -------------------------- |
| **Replicas**        | 1                  | 3-5                      | 10-50                      |
| **Requisições/seg** | 500                | 5K                       | 20K-100K                   |
| **Latência P95**    | 100ms              | 50ms                     | 20-30ms                    |
| **Uptime**          | 99.0%              | 99.5%                    | 99.9%+                     |
| **Custo Mensal**    | ~$50               | ~$200                    | ~$1000                     |

---

## ⚡ Otimizações para 5K+ usuários

### 1. Connection Pooling

```javascript
// No código da API
const pool = new MongoDBConnectionPool({
  maxPoolSize: 100,
  minPoolSize: 10,
});
```

### 2. Caching Strategy

```javascript
// Cache em múltiplas camadas
1. Browser cache (assets estáticos)
2. CDN cache (Cloudflare)
3. Redis cache (sessões, data)
4. Database cache (MongoDB)
```

### 3. Database Indexing

```javascript
// Índices críticos já configurados
db.users.createIndex({ email: 1 }); // Login rápido
db.users.createIndex({ role: 1 }); // Filtro de roles
db.orders.createIndex({ userId: 1, createdAt: -1 }); // Query rápida
```

### 4. Request Optimization

```javascript
// GraphQL (alternativa ao REST)
// - Fetch apenas dados necessários
// - Reduz bandwidth em 30-50%
```

---

## 🎯 Checklist de Escalabilidade

### Fase Atual (Docker Compose)

- ✅ Aplicação rodando
- ✅ Emails em TEST mode
- ✅ Admin panel funcional
- [ ] Pronto para scale

### Antes de 5K usuários

- [ ] Kubernetes cluster pronto
- [ ] MongoDB Replica Set
- [ ] Redis Cluster
- [ ] Monitoring (Prometheus/Grafana)
- [ ] CDN configurado
- [ ] Rate limiting ajustado
- [ ] Database backups automáticos
- [ ] Load testing realizado
- [ ] Runbooks documentados
- [ ] On-call rotation setup

---

**Próximo passo:** Familiarize-se com Kubernetes ou contrate alguém para gerenciar a infraestrutura! 🚀
