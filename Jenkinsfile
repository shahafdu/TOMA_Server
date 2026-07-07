def app

pipeline {

    environment {
        registry = "registry.example.com:5000"
        repository = "training/cm_client"
        container_name = "cm_client"
    }
    
    agent {
        label 'LinuxNode3'
    }
	
	parameters {
        booleanParam(defaultValue: false, description: '', name: 'production')
    }
    
    stages {
        stage('Clean') {
            steps {
                sh 'rm -rf node_modules/*'
            }
        }
        
        stage('Build') { 
            steps {
                script {
                    ansiColor('xterm') {
                        app = docker.build("${repository}")
                    }
                }
            }
        }
        
        stage('Push') {
            steps {
                 script {
                    docker.withRegistry("http://${registry}", '${REGISTRY_CREDENTIALS}') {
                        app.push("${env.BUILD_NUMBER}")
                        app.push("latest")
                    }
                }
            }
        }
        
        stage('Deploy') {
            steps {
				script {
                    def ext_port1 = 8080                    
                    if (! params.production) {
                        container_name = container_name + "_test"
                        ext_port1 = 8085                      
                    }
					sh "ssh deploy@docker-host  docker login -u deploy -p ${REGISTRY_PASSWORD} ${registry}"
					sh "ssh deploy@docker-host  docker pull ${registry}/${repository}:latest"
					sh "ssh deploy@docker-host  docker kill ${container_name} || exit 0"
					sh "ssh deploy@docker-host  docker rm ${container_name} || exit 0"
					sh "ssh deploy@docker-host  docker run --name ${container_name} -d -p ${ext_port1}:80 -v /etc/resolv.conf:/etc/resolv.conf --restart unless-stopped ${registry}/${repository}:latest"
					sh "ssh deploy@docker-host docker logs ${container_name} || exit 0"
				}
            }
        }
    }
}