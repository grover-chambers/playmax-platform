allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

// Reverted custom build directory to default to fix Gradle service initialization error on Windows
// val newBuildDir: Directory =
//    rootProject.layout.buildDirectory
//        .dir("../../build")
//        .get()
// rootProject.layout.buildDirectory.value(newBuildDir)

// subprojects {
//    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
//    project.layout.buildDirectory.value(newSubprojectBuildDir)
// }
subprojects {
    afterEvaluate {
        extensions.findByType(com.android.build.api.dsl.CommonExtension::class.java)
            ?.let { it.compileSdk = 36 }
    }
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
